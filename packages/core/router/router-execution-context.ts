import {
  ForbiddenException,
  HttpServer,
  ParamData,
  PipeTransform,
  RequestMethod,
} from '@nestjs/common';
import {
  CUSTOM_ROUTE_AGRS_METADATA,
  HEADERS_METADATA,
  HTTP_CODE_METADATA,
  RENDER_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';
import { RouteParamsMetadata } from '@nestjs/common/decorators';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { Controller, Transform } from '@nestjs/common/interfaces';
import {
  isEmpty,
  isFunction,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import 'reflect-metadata';
import { FORBIDDEN_MESSAGE } from '../guards/constants';
import { GuardsConsumer } from '../guards/guards-consumer';
import { GuardsContextCreator } from '../guards/guards-context-creator';
import { ContextUtils } from '../helpers/context-utils';
import { InterceptorsConsumer } from '../interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../interceptors/interceptors-context-creator';
import { PipesConsumer } from '../pipes/pipes-consumer';
import { PipesContextCreator } from '../pipes/pipes-context-creator';
import { IRouteParamsFactory } from './interfaces/route-params-factory.interface';
import {
  CustomHeader,
  RouterResponseController,
} from './router-response-controller';

export interface ParamProperties {
  index: number;
  type: RouteParamtypes | string;
  data: ParamData;
  pipes: PipeTransform[];
  extractValue: (req, res, next) => any;
}

export class RouterExecutionContext {
  private readonly contextUtils = new ContextUtils();
  private readonly responseController: RouterResponseController;

  constructor(
    private readonly paramsFactory: IRouteParamsFactory,
    private readonly pipesContextCreator: PipesContextCreator,
    private readonly pipesConsumer: PipesConsumer,
    private readonly guardsContextCreator: GuardsContextCreator,
    private readonly guardsConsumer: GuardsConsumer,
    private readonly interceptorsContextCreator: InterceptorsContextCreator,
    private readonly interceptorsConsumer: InterceptorsConsumer,
    private readonly applicationRef: HttpServer,
  ) {
    this.responseController = new RouterResponseController(applicationRef);
  }

  public create(
    instance: Controller,
    callback: (...args) => any,
    methodName: string,
    module: string,
    requestMethod: RequestMethod,
  ) {
    const metadata =
      this.contextUtils.reflectCallbackMetadata(
        instance,
        methodName,
        ROUTE_ARGS_METADATA,
      ) || {};
    const keys = Object.keys(metadata);
    const argsLength = this.contextUtils.getArgumentsLength(keys, metadata);
    const pipes = this.pipesContextCreator.create(instance, callback, module);
    const paramtypes = this.contextUtils.reflectCallbackParamtypes(
      instance,
      methodName,
    );
    const guards = this.guardsContextCreator.create(instance, callback, module);
    const interceptors = this.interceptorsContextCreator.create(
      instance,
      callback,
      module,
    );
    const httpCode = this.reflectHttpStatusCode(callback);
    const paramsMetadata = this.exchangeKeysForValues(keys, metadata, module);
    const isResponseHandled = paramsMetadata.some(
      ({ type }) =>
        type === RouteParamtypes.RESPONSE || type === RouteParamtypes.NEXT,
    );
    const paramsOptions = this.contextUtils.mergeParamsMetatypes(
      paramsMetadata,
      paramtypes,
    );
    const httpStatusCode = httpCode
      ? httpCode
      : this.responseController.getStatusByMethod(requestMethod);

    const fnCanActivate = this.createGuardsFn(guards, instance, callback);
    const fnApplyPipes = this.createPipesFn(pipes, paramsOptions);
    const fnHandleResponse = this.createHandleResponseFn(
      callback,
      isResponseHandled,
      httpStatusCode,
    );
    const handler = (args, req, res, next) => async () => {
      fnApplyPipes && (await fnApplyPipes(args, req, res, next));
      return callback.apply(instance, args);
    };

    return async (req, res, next) => {
      const args = this.contextUtils.createNullArray(argsLength);
      fnCanActivate && (await fnCanActivate([req, res]));

      const result = await this.interceptorsConsumer.intercept(
        interceptors,
        [req, res],
        instance,
        callback,
        handler(args, req, res, next),
      );
      await fnHandleResponse(result, res);
    };
  }

  public reflectHttpStatusCode(callback: (...args) => any): number {
    return Reflect.getMetadata(HTTP_CODE_METADATA, callback);
  }

  public reflectRenderTemplate(callback): string {
    return Reflect.getMetadata(RENDER_METADATA, callback);
  }

  public reflectResponseHeaders(callback): CustomHeader[] {
    return Reflect.getMetadata(HEADERS_METADATA, callback) || [];
  }

  public exchangeKeysForValues(
    keys: string[],
    metadata: RouteParamsMetadata,
    moduleContext: string,
  ): ParamProperties[] {
    this.pipesContextCreator.setModuleContext(moduleContext);
    return keys.map(key => {
      const { index, data, pipes: pipesCollection } = metadata[key];
      const pipes = this.pipesContextCreator.createConcreteContext(
        pipesCollection,
      );
      const type = this.contextUtils.mapParamType(key);

      if (key.includes(CUSTOM_ROUTE_AGRS_METADATA)) {
        const { factory } = metadata[key];
        const customExtractValue = this.getCustomFactory(factory, data);
        return { index, extractValue: customExtractValue, type, data, pipes };
      }
      const numericType = Number(type);
      const extractValue = (req, res, next) =>
        this.paramsFactory.exchangeKeyForValue(numericType, data, {
          req,
          res,
          next,
        });
      return { index, extractValue, type: numericType, data, pipes };
    });
  }

  public getCustomFactory(factory: (...args) => void, data): (...args) => any {
    return !isUndefined(factory) && isFunction(factory)
      ? (req, res, next) => factory(data, req)
      : () => null;
  }

  public async getParamValue<T>(
    value: T,
    { metatype, type, data },
    transforms: Transform<any>[],
  ): Promise<any> {
    if (
      type === RouteParamtypes.BODY ||
      type === RouteParamtypes.QUERY ||
      type === RouteParamtypes.PARAM ||
      isString(type)
    ) {
      return this.pipesConsumer.apply(
        value,
        { metatype, type, data },
        transforms,
      );
    }
    return Promise.resolve(value);
  }

  public createGuardsFn(
    guards: any[],
    instance: Controller,
    callback: (...args) => any,
  ): Function | null {
    const canActivateFn = async (args: any[]) => {
      const canActivate = await this.guardsConsumer.tryActivate(
        guards,
        args,
        instance,
        callback,
      );
      if (!canActivate) {
        throw new ForbiddenException(FORBIDDEN_MESSAGE);
      }
    };
    return guards.length ? canActivateFn : null;
  }

  public createPipesFn(
    pipes: any[],
    paramsOptions: (ParamProperties & { metatype?: any })[],
  ) {
    const pipesFn = async (args, req, res, next) => {
      await Promise.all(
        paramsOptions.map(async param => {
          const {
            index,
            extractValue,
            type,
            data,
            metatype,
            pipes: paramPipes,
          } = param;
          const value = extractValue(req, res, next);

          args[index] = await this.getParamValue(
            value,
            { metatype, type, data },
            pipes.concat(paramPipes),
          );
        }),
      );
    };
    return paramsOptions.length ? pipesFn : null;
  }

  public createHandleResponseFn(
    callback,
    isResponseHandled: boolean,
    httpStatusCode: number,
  ) {
    const renderTemplate = this.reflectRenderTemplate(callback);
    const responseHeaders = this.reflectResponseHeaders(callback);
    const hasCustomHeaders = !isEmpty(responseHeaders);

    if (renderTemplate) {
      return async (result, res) => {
        hasCustomHeaders &&
          this.responseController.setHeaders(res, responseHeaders);
        await this.responseController.render(result, res, renderTemplate);
      };
    }
    return async (result, res) => {
      hasCustomHeaders &&
        this.responseController.setHeaders(res, responseHeaders);

      !isResponseHandled &&
        (await this.responseController.apply(result, res, httpStatusCode));
    };
  }
}
