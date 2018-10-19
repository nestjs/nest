import { ForbiddenException, ParamData } from '@nestjs/common';
import { CUSTOM_ROUTE_AGRS_METADATA } from '@nestjs/common/constants';
import { Controller, Transform } from '@nestjs/common/interfaces';
import { isFunction, isUndefined } from '@nestjs/common/utils/shared.utils';
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
import { ContextUtils, ParamProperties } from './context-utils';

export interface ParamsMetadata {
  [prop: number]: {
    index: number;
    data?: ParamData;
  };
}

export interface ParamsFactory {
  exchangeKeyForValue(type: number, data: ParamData, args: any): any;
}

export class ExternalContextCreator {
  private readonly contextUtils = new ContextUtils();

  constructor(
    private readonly guardsContextCreator: GuardsContextCreator,
    private readonly guardsConsumer: GuardsConsumer,
    private readonly interceptorsContextCreator: InterceptorsContextCreator,
    private readonly interceptorsConsumer: InterceptorsConsumer,
    private readonly modulesContainer: ModulesContainer,
    private readonly pipesContextCreator: PipesContextCreator,
    private readonly pipesConsumer: PipesConsumer,
  ) {}

  static fromContainer(container: NestContainer): ExternalContextCreator {
    return new ExternalContextCreator(
      new GuardsContextCreator(container, container.applicationConfig),
      new GuardsConsumer(),
      new InterceptorsContextCreator(container, container.applicationConfig),
      new InterceptorsConsumer(),
      container.getModules(),
      new PipesContextCreator(container, container.applicationConfig),
      new PipesConsumer(),
    );
  }

  public create<T extends ParamsMetadata = ParamsMetadata>(
    instance: Controller,
    callback: (...args) => any,
    methodName: string,
    metadataKey?: string,
    paramsFactory?: ParamsFactory,
  ) {
    const module = this.findContextModuleName(instance.constructor);
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

    const metadata =
      this.contextUtils.reflectCallbackMetadata<T>(
        instance,
        methodName,
        metadataKey || '',
      ) || {};
    const keys = Object.keys(metadata);
    const argsLength = this.contextUtils.getArgumentsLength(keys, metadata);
    const paramsMetadata = paramsFactory
      ? this.exchangeKeysForValues(keys, metadata, module, paramsFactory)
      : null;

    const paramsOptions = paramsMetadata
      ? this.contextUtils.mergeParamsMetatypes(paramsMetadata, paramtypes)
      : [];
    const fnApplyPipes = this.createPipesFn(pipes, paramsOptions);

    const handler = (initialArgs, ...args) => async () => {
      if (fnApplyPipes) {
        await fnApplyPipes(initialArgs, ...args);
        return callback.apply(instance, initialArgs);
      }
      return callback.apply(instance, args);
    };

    return async (...args) => {
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
  }

  public findContextModuleName(constructor: Function): string {
    const className = constructor.name;
    if (!className) {
      return '';
    }
    for (const [key, module] of [...this.modulesContainer.entries()]) {
      if (this.findComponentByClassName(module, className)) {
        return key;
      }
    }
    return '';
  }

  public findComponentByClassName(module: Module, className: string): boolean {
    const { components } = module;
    const hasComponent = [...components.keys()].some(
      component => component === className,
    );
    return hasComponent;
  }

  public exchangeKeysForValues<TMetadata = any>(
    keys: string[],
    metadata: TMetadata,
    moduleContext: string,
    paramsFactory: ParamsFactory,
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
      const extractValue = (...args) =>
        paramsFactory.exchangeKeyForValue(numericType, data, args);

      return { index, extractValue, type: numericType, data, pipes };
    });
  }

  public getCustomFactory(factory: (...args) => void, data): (...args) => any {
    return !isUndefined(factory) && isFunction(factory)
      ? (...args) => factory(data, args)
      : () => null;
  }

  public createPipesFn(
    pipes: any[],
    paramsOptions: (ParamProperties & { metatype?: any })[],
  ) {
    const pipesFn = async (args, ...gqlArgs) => {
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
          const value = extractValue(...gqlArgs);

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
    { metatype, type, data },
    transforms: Transform<any>[],
  ): Promise<any> {
    return this.pipesConsumer.apply(
      value,
      { metatype, type, data },
      transforms,
    );
  }

  public async transformToResult(resultOrDeffered) {
    if (resultOrDeffered && isFunction(resultOrDeffered.subscribe)) {
      return resultOrDeffered.toPromise();
    }
    return resultOrDeffered;
  }
}
