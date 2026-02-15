import type {
  ArgumentMetadata,
  ContextType,
  PipeTransform,
} from '@nestjs/common';
import {
  type Controller,
  CUSTOM_ROUTE_ARGS_METADATA,
  isEmpty,
  PARAMTYPES_METADATA,
} from '@nestjs/common/internal';
import {
  ContextUtils,
  type ExecutionContextHost,
  FORBIDDEN_MESSAGE,
  type GuardsConsumer,
  type GuardsContextCreator,
  HandlerMetadataStorage,
  type InterceptorsConsumer,
  type InterceptorsContextCreator,
  type ParamProperties,
  type ParamsMetadata,
  type PipesConsumer,
  type PipesContextCreator,
} from '@nestjs/core/internal';
import { MESSAGE_METADATA, PARAM_ARGS_METADATA } from '../constants.js';
import { WsException } from '../errors/ws-exception.js';
import { WsParamsFactory } from '../factories/ws-params-factory.js';
import { ExceptionFiltersContext } from './exception-filters-context.js';
import { DEFAULT_CALLBACK_METADATA } from './ws-metadata-constants.js';
import { WsProxy } from './ws-proxy.js';

type WsParamProperties = ParamProperties & { metatype?: any };
export interface WsHandlerMetadata {
  argsLength: number;
  paramtypes: any[];
  getParamsMetadata: (moduleKey: string) => WsParamProperties[];
}

export class WsContextCreator {
  private readonly contextUtils = new ContextUtils();
  private readonly wsParamsFactory = new WsParamsFactory();
  private readonly handlerMetadataStorage =
    new HandlerMetadataStorage<WsHandlerMetadata>();

  constructor(
    private readonly wsProxy: WsProxy,
    private readonly exceptionFiltersContext: ExceptionFiltersContext,
    private readonly pipesContextCreator: PipesContextCreator,
    private readonly pipesConsumer: PipesConsumer,
    private readonly guardsContextCreator: GuardsContextCreator,
    private readonly guardsConsumer: GuardsConsumer,
    private readonly interceptorsContextCreator: InterceptorsContextCreator,
    private readonly interceptorsConsumer: InterceptorsConsumer,
  ) {}

  public create<T extends ParamsMetadata = ParamsMetadata>(
    instance: Controller,
    callback: (...args: unknown[]) => void,
    moduleKey: string,
    methodName: string,
  ): (...args: any[]) => Promise<void> {
    const contextType: ContextType = 'ws';
    const { argsLength, paramtypes, getParamsMetadata } = this.getMetadata<T>(
      instance,
      methodName,
      contextType,
    );
    const exceptionHandler = this.exceptionFiltersContext.create(
      instance,
      callback,
      moduleKey,
    );
    const pipes = this.pipesContextCreator.create(
      instance,
      callback,
      moduleKey,
    );
    const guards = this.guardsContextCreator.create(
      instance,
      callback,
      moduleKey,
    );
    const interceptors = this.interceptorsContextCreator.create(
      instance,
      callback,
      moduleKey,
    );

    const paramsMetadata = getParamsMetadata(moduleKey);
    const paramsOptions = paramsMetadata
      ? this.contextUtils.mergeParamsMetatypes(paramsMetadata, paramtypes)
      : [];
    const fnApplyPipes = this.createPipesFn(pipes, paramsOptions);

    const fnCanActivate = this.createGuardsFn(
      guards,
      instance,
      callback,
      contextType,
    );

    const handler = (initialArgs: unknown[], args: unknown[]) => async () => {
      if (fnApplyPipes) {
        await fnApplyPipes(initialArgs, ...args);
        return callback.apply(instance, initialArgs);
      }
      return callback.apply(instance, args);
    };
    const targetPattern = this.reflectCallbackPattern(callback);
    return this.wsProxy.create(
      async (...args: unknown[]) => {
        args.push(targetPattern);

        const initialArgs = this.contextUtils.createNullArray(argsLength);
        fnCanActivate && (await fnCanActivate(args));

        return this.interceptorsConsumer.intercept(
          interceptors,
          args,
          instance,
          callback,
          handler(initialArgs, args),
          contextType,
        );
      },
      exceptionHandler,
      targetPattern,
    );
  }

  public reflectCallbackParamtypes(
    instance: Controller,
    callback: (...args: any[]) => any,
  ): any[] {
    return Reflect.getMetadata(PARAMTYPES_METADATA, instance, callback.name);
  }

  public reflectCallbackPattern(callback: (...args: any[]) => any): string {
    return Reflect.getMetadata(MESSAGE_METADATA, callback);
  }

  public createGuardsFn<TContext extends string = ContextType>(
    guards: any[],
    instance: Controller,
    callback: (...args: unknown[]) => any,
    contextType?: TContext,
  ): Function | null {
    const canActivateFn = async (args: any[]) => {
      const canActivate = await this.guardsConsumer.tryActivate<TContext>(
        guards,
        args,
        instance,
        callback,
        contextType,
      );
      if (!canActivate) {
        throw new WsException(FORBIDDEN_MESSAGE);
      }
    };
    return guards.length ? canActivateFn : null;
  }

  public getMetadata<TMetadata, TContext extends ContextType = ContextType>(
    instance: Controller,
    methodName: string,
    contextType: TContext,
  ): WsHandlerMetadata {
    const cacheMetadata = this.handlerMetadataStorage.get(instance, methodName);
    if (cacheMetadata) {
      return cacheMetadata;
    }
    const metadata =
      this.contextUtils.reflectCallbackMetadata<TMetadata>(
        instance,
        methodName,
        PARAM_ARGS_METADATA,
      ) || DEFAULT_CALLBACK_METADATA;
    const keys = Object.keys(metadata);
    const argsLength = this.contextUtils.getArgumentsLength(keys, metadata);
    const paramtypes = this.contextUtils.reflectCallbackParamtypes(
      instance,
      methodName,
    );
    const contextFactory = this.contextUtils.getContextFactory(
      contextType,
      instance,
      instance[methodName],
    );
    const getParamsMetadata = (moduleKey: string) =>
      this.exchangeKeysForValues(
        keys,
        metadata,
        moduleKey,
        this.wsParamsFactory,
        contextFactory,
      );

    const handlerMetadata: WsHandlerMetadata = {
      argsLength,
      paramtypes,
      getParamsMetadata,
    };
    this.handlerMetadataStorage.set(instance, methodName, handlerMetadata);
    return handlerMetadata;
  }

  public exchangeKeysForValues<TMetadata = any>(
    keys: string[],
    metadata: TMetadata,
    moduleContext: string,
    paramsFactory: WsParamsFactory,
    contextFactory: (args: unknown[]) => ExecutionContextHost,
  ): ParamProperties[] {
    this.pipesContextCreator.setModuleContext(moduleContext);

    return keys.map(key => {
      const { index, data, pipes: pipesCollection, schema } = metadata[key];
      const pipes =
        this.pipesContextCreator.createConcreteContext(pipesCollection);
      const type = this.contextUtils.mapParamType(key);

      if (key.includes(CUSTOM_ROUTE_ARGS_METADATA)) {
        const { factory } = metadata[key];
        const customExtractValue = this.contextUtils.getCustomFactory(
          factory,
          data,
          contextFactory,
        );
        return {
          index,
          extractValue: customExtractValue,
          type,
          data,
          pipes,
          schema,
        };
      }
      const numericType = Number(type);
      const extractValue = (...args: any[]) =>
        paramsFactory.exchangeKeyForValue(numericType, data, args);

      return { index, extractValue, type: numericType, data, pipes, schema };
    });
  }

  public createPipesFn(
    pipes: PipeTransform[],
    paramsOptions: (ParamProperties & { metatype?: unknown })[],
  ) {
    const pipesFn = async (args: unknown[], ...params: unknown[]) => {
      const resolveParamValue = async (
        param: ParamProperties & { metatype?: unknown },
      ) => {
        const {
          index,
          extractValue,
          type,
          data,
          metatype,
          pipes: paramPipes,
          schema,
        } = param;
        const value = extractValue(...params);

        args[index] = await this.getParamValue(
          value,
          { metatype, type, data, schema } as ArgumentMetadata,
          pipes.concat(paramPipes),
        );
      };
      await Promise.all(paramsOptions.map(resolveParamValue));
    };
    return paramsOptions.length ? pipesFn : null;
  }

  public async getParamValue<T>(
    value: T,
    metadata: ArgumentMetadata,
    pipes: PipeTransform[],
  ): Promise<any> {
    return isEmpty(pipes)
      ? value
      : this.pipesConsumer.apply(value, metadata, pipes);
  }
}
