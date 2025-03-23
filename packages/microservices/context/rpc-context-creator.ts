import type { ContextType, PipeTransform } from '@nestjs/common';
import {
  type Controller,
  CUSTOM_ROUTE_ARGS_METADATA,
  isEmptyArray,
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
  STATIC_CONTEXT,
} from '@nestjs/core/internal';
import { Observable } from 'rxjs';
import { PARAM_ARGS_METADATA } from '../constants.js';
import { RpcException } from '../exceptions/index.js';
import { RpcParamsFactory } from '../factories/rpc-params-factory.js';
import { ExceptionFiltersContext } from './exception-filters-context.js';
import { DEFAULT_CALLBACK_METADATA } from './rpc-metadata-constants.js';
import { RpcProxy } from './rpc-proxy.js';

type RpcParamProperties = ParamProperties & { metatype?: any };
export interface RpcHandlerMetadata {
  argsLength: number;
  paramtypes: any[];
  getParamsMetadata: (moduleKey: string) => RpcParamProperties[];
}

export class RpcContextCreator {
  private readonly contextUtils = new ContextUtils();
  private readonly rpcParamsFactory = new RpcParamsFactory();
  private readonly handlerMetadataStorage =
    new HandlerMetadataStorage<RpcHandlerMetadata>();

  constructor(
    private readonly rpcProxy: RpcProxy,
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
    callback: (...args: unknown[]) => Observable<any>,
    moduleKey: string,
    methodName: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
    defaultCallMetadata: Record<string, any> = DEFAULT_CALLBACK_METADATA,
  ): (...args: any[]) => Promise<Observable<any>> {
    const contextType: ContextType = 'rpc';
    const { argsLength, paramtypes, getParamsMetadata } = this.getMetadata<T>(
      instance,
      methodName,
      defaultCallMetadata,
      contextType,
    );

    const exceptionHandler = this.exceptionFiltersContext.create(
      instance,
      callback,
      moduleKey,
      contextId,
      inquirerId,
    );
    const pipes = this.pipesContextCreator.create(
      instance,
      callback,
      moduleKey,
      contextId,
      inquirerId,
    );
    const guards = this.guardsContextCreator.create(
      instance,
      callback,
      moduleKey,
      contextId,
      inquirerId,
    );
    const interceptors = this.interceptorsContextCreator.create(
      instance,
      callback,
      moduleKey,
      contextId,
      inquirerId,
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

    return this.rpcProxy.create(async (...args: unknown[]) => {
      const initialArgs = this.contextUtils.createNullArray(argsLength);
      fnCanActivate && (await fnCanActivate(args));

      return this.interceptorsConsumer.intercept(
        interceptors,
        args,
        instance,
        callback,
        handler(initialArgs, args),
        contextType,
      ) as Promise<Observable<unknown>>;
    }, exceptionHandler);
  }

  public reflectCallbackParamtypes(
    instance: Controller,
    callback: (...args: unknown[]) => unknown,
  ): unknown[] {
    return Reflect.getMetadata(PARAMTYPES_METADATA, instance, callback.name);
  }

  public createGuardsFn<TContext extends string = ContextType>(
    guards: any[],
    instance: Controller,
    callback: (...args: unknown[]) => unknown,
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
        throw new RpcException(FORBIDDEN_MESSAGE);
      }
    };
    return guards.length ? canActivateFn : null;
  }

  public getMetadata<TMetadata, TContext extends ContextType = ContextType>(
    instance: Controller,
    methodName: string,
    defaultCallMetadata: Record<string, any>,
    contextType: TContext,
  ): RpcHandlerMetadata {
    const cacheMetadata = this.handlerMetadataStorage.get(instance, methodName);
    if (cacheMetadata) {
      return cacheMetadata;
    }
    const metadata =
      this.contextUtils.reflectCallbackMetadata<TMetadata>(
        instance,
        methodName,
        PARAM_ARGS_METADATA,
      ) || defaultCallMetadata;
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
        this.rpcParamsFactory,
        contextFactory,
      );

    const handlerMetadata: RpcHandlerMetadata = {
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
    paramsFactory: RpcParamsFactory,
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
      const extractValue = (...args: unknown[]) =>
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
        } = param;
        const value = extractValue(...params);

        args[index] = await this.getParamValue(
          value,
          { metatype, type, data },
          pipes.concat(paramPipes),
        );
      };
      await Promise.all(paramsOptions.map(resolveParamValue));
    };
    return paramsOptions.length ? pipesFn : null;
  }

  public async getParamValue<T>(
    value: T,
    { metatype, type, data }: { metatype: any; type: any; data: any },
    pipes: PipeTransform[],
  ): Promise<any> {
    return isEmptyArray(pipes)
      ? value
      : this.pipesConsumer.apply(value, { metatype, type, data }, pipes);
  }
}
