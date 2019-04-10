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
} from '@nestjs/common/utils/shared.utils';
import { FORBIDDEN_MESSAGE } from '../guards/constants';
import { GuardsConsumer } from '../guards/guards-consumer';
import { GuardsContextCreator } from '../guards/guards-context-creator';
import { ContextUtils } from '../helpers/context-utils';
import {
  HandlerMetadata,
  HandlerMetadataStorage,
} from '../helpers/handler-metadata-storage';
import { STATIC_CONTEXT } from '../injector/constants';
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
  extractValue: <TRequest, TResponse>(
    req: TRequest,
    res: TResponse,
    next: Function,
  ) => any;
}

export class RouterExecutionContext {
  private readonly handlerMetadataStorage = new HandlerMetadataStorage();
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
    readonly applicationRef: HttpServer,
  ) {
    this.responseController = new RouterResponseController(applicationRef);
  }

  public create(
    instance: Controller,
    callback: (...args: any[]) => any,
    methodName: string,
    module: string,
    requestMethod: RequestMethod,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ) {
    const {
      argsLength,
      fnHandleResponse,
      paramtypes,
      getParamsMetadata,
    } = this.getMetadata(instance, callback, methodName, module);
    const paramsOptions = this.contextUtils.mergeParamsMetatypes(
      getParamsMetadata(module, contextId, inquirerId),
      paramtypes,
    );
    const pipes = this.pipesContextCreator.create(
      instance,
      callback,
      module,
      contextId,
      inquirerId,
    );
    const guards = this.guardsContextCreator.create(
      instance,
      callback,
      module,
      contextId,
      inquirerId,
    );
    const interceptors = this.interceptorsContextCreator.create(
      instance,
      callback,
      module,
      contextId,
      inquirerId,
    );

    const fnCanActivate = this.createGuardsFn(guards, instance, callback);
    const fnApplyPipes = this.createPipesFn(pipes, paramsOptions);

    const handler = <TRequest, TResponse>(
      args: any[],
      req: TRequest,
      res: TResponse,
      next: Function,
    ) => async () => {
      fnApplyPipes && (await fnApplyPipes(args, req, res, next));
      return callback.apply(instance, args);
    };

    return async <TRequest, TResponse>(
      req: TRequest,
      res: TResponse,
      next: Function,
    ) => {
      const args = this.contextUtils.createNullArray(argsLength);
      fnCanActivate && (await fnCanActivate([req, res]));

      const httpCode = this.reflectHttpStatusCode(callback);

      const httpStatusCode = httpCode
        ? httpCode
        : this.responseController.getStatusByMethod(requestMethod);

      this.responseController.status(res, httpStatusCode);

      const responseHeaders = this.reflectResponseHeaders(callback);
      const hasCustomHeaders = !isEmpty(responseHeaders);

      hasCustomHeaders &&
        this.responseController.setHeaders(res, responseHeaders);

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

  public getMetadata(
    instance: Controller,
    callback: (...args: any[]) => any,
    methodName: string,
    module: string
  ): HandlerMetadata {
    const cacheMetadata = this.handlerMetadataStorage.get(instance, methodName);
    if (cacheMetadata) {
      return cacheMetadata;
    }
    const metadata =
      this.contextUtils.reflectCallbackMetadata(
        instance,
        methodName,
        ROUTE_ARGS_METADATA,
      ) || {};
    const keys = Object.keys(metadata);
    const argsLength = this.contextUtils.getArgumentsLength(keys, metadata);
    const paramtypes = this.contextUtils.reflectCallbackParamtypes(
      instance,
      methodName,
    );
    const getParamsMetadata = (
      moduleKey: string,
      contextId = STATIC_CONTEXT,
      inquirerId?: string,
    ) =>
      this.exchangeKeysForValues(
        keys,
        metadata,
        moduleKey,
        contextId,
        inquirerId,
      );

    const paramsMetadata = getParamsMetadata(module);
    const isResponseHandled = paramsMetadata.some(
      ({ type }) =>
        type === RouteParamtypes.RESPONSE || type === RouteParamtypes.NEXT,
    );

    const fnHandleResponse = this.createHandleResponseFn(
      callback,
      isResponseHandled
    );
    const handlerMetadata: HandlerMetadata = {
      argsLength,
      fnHandleResponse,
      paramtypes,
      getParamsMetadata,
    };
    this.handlerMetadataStorage.set(instance, methodName, handlerMetadata);
    return handlerMetadata;
  }

  public reflectHttpStatusCode(callback: (...args: any[]) => any): number {
    return Reflect.getMetadata(HTTP_CODE_METADATA, callback);
  }

  public reflectRenderTemplate(callback: (...args: any[]) => any): string {
    return Reflect.getMetadata(RENDER_METADATA, callback);
  }

  public reflectResponseHeaders(
    callback: (...args: any[]) => any,
  ): CustomHeader[] {
    return Reflect.getMetadata(HEADERS_METADATA, callback) || [];
  }

  public exchangeKeysForValues(
    keys: string[],
    metadata: RouteParamsMetadata,
    moduleContext: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): ParamProperties[] {
    this.pipesContextCreator.setModuleContext(moduleContext);
    return keys.map(key => {
      const { index, data, pipes: pipesCollection } = metadata[key];
      const pipes = this.pipesContextCreator.createConcreteContext(
        pipesCollection,
        contextId,
        inquirerId,
      );
      const type = this.contextUtils.mapParamType(key);

      if (key.includes(CUSTOM_ROUTE_AGRS_METADATA)) {
        const { factory } = metadata[key];
        const customExtractValue = this.getCustomFactory(factory, data);
        return { index, extractValue: customExtractValue, type, data, pipes };
      }
      const numericType = Number(type);
      const extractValue = <TRequest, TResponse>(
        req: TRequest,
        res: TResponse,
        next: Function,
      ) =>
        this.paramsFactory.exchangeKeyForValue(numericType, data, {
          req,
          res,
          next,
        });
      return { index, extractValue, type: numericType, data, pipes };
    });
  }

  public getCustomFactory(
    factory: (...args: any[]) => void,
    data: any,
  ): (...args: any[]) => any {
    return isFunction(factory)
      ? (req, res, next) => factory(data, req)
      : () => null;
  }

  public async getParamValue<T>(
    value: T,
    {
      metatype,
      type,
      data,
    }: { metatype: any; type: RouteParamtypes; data: any },
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
        { metatype, type, data } as any,
        transforms,
      );
    }
    return Promise.resolve(value);
  }

  public createGuardsFn(
    guards: any[],
    instance: Controller,
    callback: (...args: any[]) => any,
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
    const pipesFn = async <TRequest, TResponse>(
      args: any[],
      req: TRequest,
      res: TResponse,
      next: Function,
    ) => {
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
            { metatype, type, data } as any,
            pipes.concat(paramPipes),
          );
        }),
      );
    };
    return paramsOptions.length ? pipesFn : null;
  }

  public createHandleResponseFn(
    callback: (...args: any[]) => any,
    isResponseHandled: boolean,
    httpStatusCode?: number
  ) {
    const renderTemplate = this.reflectRenderTemplate(callback);

    if (renderTemplate) {
      return async <TResult, TResponse>(result: TResult, res: TResponse) => {
        await this.responseController.render(result, res, renderTemplate);
      };
    }
    return async <TResult, TResponse>(result: TResult, res: TResponse) => {
      result = await this.responseController.transformToResult(result);
      !isResponseHandled &&
        (await this.responseController.apply(result, res, httpStatusCode));
    };
  }
}
