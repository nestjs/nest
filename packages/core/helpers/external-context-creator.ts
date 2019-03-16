import { ForbiddenException, ParamData } from '@nestjs/common';
import { CUSTOM_ROUTE_AGRS_METADATA } from '@nestjs/common/constants';
import { Controller, Transform } from '@nestjs/common/interfaces';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { FORBIDDEN_MESSAGE } from '../guards/constants';
import { GuardsConsumer } from '../guards/guards-consumer';
import { GuardsContextCreator } from '../guards/guards-context-creator';
import { NestContainer } from '../injector/container';
import { Module } from '../injector/module';
import { ModulesContainer } from '../injector/modules-container';
import { InterceptorsConsumer } from '../interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../interceptors/interceptors-context-creator';
import { PipesConsumer } from '../pipes/pipes-consumer';
import { PipesContextCreator } from '../pipes/pipes-context-creator';
import { ExternalExceptionFilterContext } from './../exceptions/external-exception-filter-context';
import { STATIC_CONTEXT } from './../injector/constants';
import { ContextId } from './../injector/instance-wrapper';
import { ContextUtils, ParamProperties } from './context-utils';
import { ExternalErrorProxy } from './external-proxy';
import { HandlerMetadataStorage } from './handler-metadata-storage';

export interface ParamsMetadata {
  [prop: number]: {
    index: number;
    data?: ParamData;
  };
}

export interface ParamsFactory {
  exchangeKeyForValue(type: number, data: ParamData, args: any): any;
}

export interface ExternalHandlerMetadata {
  argsLength: number;
  paramtypes: any[];
  getParamsMetadata: (
    moduleKey: string,
    contextId?: ContextId,
    inquirerId?: string,
  ) => (ParamProperties & { metatype?: any })[];
}

export class ExternalContextCreator {
  private readonly contextUtils = new ContextUtils();
  private readonly externalErrorProxy = new ExternalErrorProxy();
  private readonly handlerMetadataStorage = new HandlerMetadataStorage<
    ExternalHandlerMetadata
  >();

  constructor(
    private readonly guardsContextCreator: GuardsContextCreator,
    private readonly guardsConsumer: GuardsConsumer,
    private readonly interceptorsContextCreator: InterceptorsContextCreator,
    private readonly interceptorsConsumer: InterceptorsConsumer,
    private readonly modulesContainer: ModulesContainer,
    private readonly pipesContextCreator: PipesContextCreator,
    private readonly pipesConsumer: PipesConsumer,
    private readonly filtersContextCreator: ExternalExceptionFilterContext,
  ) {}

  static fromContainer(container: NestContainer): ExternalContextCreator {
    const guardsContextCreator = new GuardsContextCreator(
      container,
      container.applicationConfig,
    );
    const guardsConsumer = new GuardsConsumer();
    const interceptorsContextCreator = new InterceptorsContextCreator(
      container,
      container.applicationConfig,
    );
    const interceptorsConsumer = new InterceptorsConsumer();
    const pipesContextCreator = new PipesContextCreator(
      container,
      container.applicationConfig,
    );
    const pipesConsumer = new PipesConsumer();
    const filtersContextCreator = new ExternalExceptionFilterContext(
      container,
      container.applicationConfig,
    );
    return new ExternalContextCreator(
      guardsContextCreator,
      guardsConsumer,
      interceptorsContextCreator,
      interceptorsConsumer,
      container.getModules(),
      pipesContextCreator,
      pipesConsumer,
      filtersContextCreator,
    );
  }

  public create<T extends ParamsMetadata = ParamsMetadata>(
    instance: Controller,
    callback: (...args: any[]) => any,
    methodName: string,
    metadataKey?: string,
    paramsFactory?: ParamsFactory,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ) {
    const module = this.findContextModuleName(instance.constructor);
    const { argsLength, paramtypes, getParamsMetadata } = this.getMetadata<T>(
      instance,
      methodName,
      metadataKey,
      paramsFactory,
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
    const exceptionFilter = this.filtersContextCreator.create(
      instance,
      callback,
      module,
      contextId,
      inquirerId,
    );

    const paramsMetadata = getParamsMetadata(module, contextId, inquirerId);
    const paramsOptions = paramsMetadata
      ? this.contextUtils.mergeParamsMetatypes(paramsMetadata, paramtypes)
      : [];

    const fnApplyPipes = this.createPipesFn(pipes, paramsOptions);
    const handler = (initialArgs: any[], ...args: any[]) => async () => {
      if (fnApplyPipes) {
        await fnApplyPipes(initialArgs, ...args);
        return callback.apply(instance, initialArgs);
      }
      return callback.apply(instance, args);
    };

    const target = async (...args: any[]) => {
      const initialArgs = this.contextUtils.createNullArray(argsLength);
      const canActivate = await this.guardsConsumer.tryActivate(
        guards,
        args,
        instance,
        callback,
      );
      if (!canActivate) {
        throw new ForbiddenException(FORBIDDEN_MESSAGE);
      }
      const result = await this.interceptorsConsumer.intercept(
        interceptors,
        args,
        instance,
        callback,
        handler(initialArgs, ...args),
      );
      return this.transformToResult(result);
    };
    return this.externalErrorProxy.createProxy(target, exceptionFilter);
  }

  public getMetadata<T>(
    instance: Controller,
    methodName: string,
    metadataKey?: string,
    paramsFactory?: ParamsFactory,
  ): ExternalHandlerMetadata {
    const cacheMetadata = this.handlerMetadataStorage.get(instance, methodName);
    if (cacheMetadata) {
      return cacheMetadata;
    }
    const metadata =
      this.contextUtils.reflectCallbackMetadata<T>(
        instance,
        methodName,
        metadataKey || '',
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
      paramsFactory
        ? this.exchangeKeysForValues(
            keys,
            metadata,
            moduleKey,
            paramsFactory,
            contextId,
            inquirerId,
          )
        : null;

    const handlerMetadata: ExternalHandlerMetadata = {
      argsLength,
      paramtypes,
      getParamsMetadata,
    };
    this.handlerMetadataStorage.set(instance, methodName, handlerMetadata);
    return handlerMetadata;
  }

  public findContextModuleName(constructor: Function): string {
    const className = constructor.name;
    if (!className) {
      return '';
    }
    for (const [key, module] of [...this.modulesContainer.entries()]) {
      if (this.findProviderByClassName(module, className)) {
        return key;
      }
    }
    return '';
  }

  public findProviderByClassName(module: Module, className: string): boolean {
    const { providers } = module;
    const hasProvider = [...providers.keys()].some(
      provider => provider === className,
    );
    return hasProvider;
  }

  public exchangeKeysForValues<TMetadata = any>(
    keys: string[],
    metadata: TMetadata,
    moduleContext: string,
    paramsFactory: ParamsFactory,
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
      const extractValue = (...args: any[]) =>
        paramsFactory.exchangeKeyForValue(numericType, data, args);

      return { index, extractValue, type: numericType, data, pipes };
    });
  }

  public getCustomFactory(
    factory: (...args: any[]) => void,
    data: any,
  ): (...args: any[]) => any {
    return isFunction(factory)
      ? (...args: any[]) => factory(data, args)
      : () => null;
  }

  public createPipesFn(
    pipes: any[],
    paramsOptions: (ParamProperties & { metatype?: any })[],
  ) {
    const pipesFn = async (args: any[], ...params: any[]) => {
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
          const value = extractValue(...params);

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

  public async getParamValue<T>(
    value: T,
    { metatype, type, data }: { metatype: any; type: any; data: any },
    transforms: Transform<any>[],
  ): Promise<any> {
    return this.pipesConsumer.apply(
      value,
      { metatype, type, data },
      transforms,
    );
  }

  public async transformToResult(resultOrDeffered: any) {
    if (resultOrDeffered && isFunction(resultOrDeffered.subscribe)) {
      return resultOrDeffered.toPromise();
    }
    return resultOrDeffered;
  }
}
