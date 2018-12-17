import { Scope } from '@nestjs/common';
import {
  OPTIONAL_DEPS_METADATA,
  OPTIONAL_PROPERTY_DEPS_METADATA,
  PARAMTYPES_METADATA,
  PROPERTY_DEPS_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from '@nestjs/common/constants';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import {
  isFunction,
  isNil,
  isObject,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { UndefinedDependencyException } from '../errors/exceptions/undefined-dependency.exception';
import { UnknownDependenciesException } from '../errors/exceptions/unknown-dependencies.exception';
import { AsyncContext } from './../hooks';
import { STATIC_CONTEXT } from './constants';
import {
  ContextId,
  InstancePerContext,
  InstanceWrapper,
} from './instance-wrapper';
import { Module } from './module';
import { ModulesContainer } from './modules-container';

/**
 * The type of an injectable dependency
 */
export type InjectorDependency = Type<any> | Function | string | symbol;

/**
 * The property-based dependency
 */
export interface PropertyDependency {
  key: string;
  name: InjectorDependency;
  isOptional?: boolean;
  instance?: any;
}

/**
 * Context of a dependency which gets injected by
 * the injector
 */
export interface InjectorDependencyContext {
  /**
   * The name of the property key (property-based injection)
   */
  key?: string;
  /**
   * The name of the function or injection token
   */
  name?: string;
  /**
   * The index of the dependency which gets injected
   * from the dependencies array
   */
  index?: number;
  /**
   * The dependency array which gets injected
   */
  dependencies?: InjectorDependency[];
}

export class Injector {
  public async loadMiddleware(
    wrapper: InstanceWrapper,
    collection: Map<string, InstanceWrapper>,
    module: Module,
    contextId = STATIC_CONTEXT,
  ) {
    const { metatype } = wrapper;
    const targetMetatype = collection.get(metatype.name);
    if (targetMetatype.instance !== null) {
      return;
    }
    const loadInstance = (instances: any[]) => {
      const instanceWrapper = new InstanceWrapper({
        instance: new metatype(...instances),
        metatype,
        host: module,
      });
      collection.set(metatype.name, instanceWrapper);
    };
    await this.resolveConstructorParams(
      wrapper,
      module,
      null,
      loadInstance,
      contextId,
    );
  }

  public async loadController(
    wrapper: InstanceWrapper<Controller>,
    module: Module,
    contextId = STATIC_CONTEXT,
  ) {
    const controllers = module.controllers;
    await this.loadInstance<Controller>(
      wrapper,
      controllers,
      module,
      contextId,
    );
  }

  public async loadInjectable(
    wrapper: InstanceWrapper<Controller>,
    module: Module,
    contextId = STATIC_CONTEXT,
  ) {
    const injectables = module.injectables;
    await this.loadInstance<Controller>(
      wrapper,
      injectables,
      module,
      contextId,
    );
  }

  public async loadProvider(
    wrapper: InstanceWrapper<Injectable>,
    module: Module,
    contextId = STATIC_CONTEXT,
  ) {
    const providers = module.providers;
    await this.loadInstance<Injectable>(wrapper, providers, module, contextId);
  }

  public loadPrototype<T>(
    { metatype, name }: InstanceWrapper<T>,
    collection: Map<string, InstanceWrapper<T>>,
    contextId = STATIC_CONTEXT,
  ) {
    if (!collection) {
      return null;
    }
    const target = collection.get(name);
    const instanceHost = target.getInstanceByContextId(contextId);
    if (
      instanceHost.isResolved ||
      !isNil(target.inject) ||
      !metatype.prototype
    ) {
      return null;
    }
    collection.set(
      name,
      new InstanceWrapper({
        ...target,
        instance: Object.create(metatype.prototype),
      }),
    );
  }

  public applyDoneHook<T>(wrapper: InstancePerContext<T>): () => void {
    let done: () => void;
    wrapper.donePromise = new Promise<void>((resolve, reject) => {
      done = resolve;
    });
    wrapper.isPending = true;
    return done;
  }

  public async loadInstance<T>(
    wrapper: InstanceWrapper<T>,
    collection: Map<string, InstanceWrapper>,
    module: Module,
    contextId = STATIC_CONTEXT,
  ) {
    const instanceHost = wrapper.getInstanceByContextId(contextId);
    if (instanceHost.isPending) {
      return instanceHost.donePromise;
    }
    const done = this.applyDoneHook(instanceHost);
    const { name, inject } = wrapper;

    const targetWrapper = collection.get(name);
    if (isUndefined(targetWrapper)) {
      throw new RuntimeException();
    }
    if (instanceHost.isResolved) {
      return;
    }
    const callback = async (instances: any[]) => {
      const properties = await this.resolveProperties(
        wrapper,
        module,
        inject,
        contextId,
      );
      const instance = await this.instantiateClass(
        instances,
        wrapper,
        targetWrapper,
        module.id,
        contextId,
      );
      this.applyProperties(instance, properties);
      done();
    };
    await this.resolveConstructorParams<T>(
      wrapper,
      module,
      inject,
      callback,
      contextId,
    );
  }

  public async resolveConstructorParams<T>(
    wrapper: InstanceWrapper<T>,
    module: Module,
    inject: InjectorDependency[],
    callback: (args: any[]) => void,
    contextId = STATIC_CONTEXT,
  ) {
    const metadata = wrapper.getCtorMetadata();
    if (metadata) {
      const dependenciesHosts = await Promise.all(
        metadata.map(async item =>
          this.resolveComponentHost(item.host, item, contextId),
        ),
      );
      const deps = dependenciesHosts.map(
        item => item.getInstanceByContextId(contextId).instance,
      );
      return callback(deps);
    }

    const dependencies = isNil(inject)
      ? this.reflectConstructorParams(wrapper.metatype)
      : inject;
    const optionalDependenciesIds = isNil(inject)
      ? this.reflectOptionalParams(wrapper.metatype)
      : [];

    let isResolved = true;

    const findOneParam = async (param, index) => {
      try {
        const paramWrapper = await this.resolveSingleParam<T>(
          wrapper,
          param,
          { index, dependencies },
          module,
          contextId,
        );
        const instanceHost = paramWrapper.getInstanceByContextId(contextId);
        if (!instanceHost.isResolved && !paramWrapper.forwardRef) {
          isResolved = false;
        }
        wrapper.addCtorMetadata(index, paramWrapper);
        return instanceHost && instanceHost.instance;
      } catch (err) {
        const isOptional = optionalDependenciesIds.includes(index);
        if (!isOptional) {
          throw err;
        }
        return undefined;
      }
    };
    const instances = await Promise.all(dependencies.map(findOneParam));
    isResolved && (await callback(instances));
  }

  public reflectConstructorParams<T>(type: Type<T>): any[] {
    const paramtypes = Reflect.getMetadata(PARAMTYPES_METADATA, type) || [];
    const selfParams = this.reflectSelfParams<T>(type);

    selfParams.forEach(({ index, param }) => (paramtypes[index] = param));
    return paramtypes;
  }

  public reflectOptionalParams<T>(type: Type<T>): any[] {
    return Reflect.getMetadata(OPTIONAL_DEPS_METADATA, type) || [];
  }

  public reflectSelfParams<T>(type: Type<T>): any[] {
    return Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, type) || [];
  }

  public async resolveSingleParam<T>(
    wrapper: InstanceWrapper<T>,
    param: Type<any> | string | symbol | any,
    dependencyContext: InjectorDependencyContext,
    module: Module,
    contextId = STATIC_CONTEXT,
  ) {
    if (isUndefined(param)) {
      throw new UndefinedDependencyException(
        wrapper.name,
        dependencyContext,
        module,
      );
    }
    const token = this.resolveParamToken(wrapper, param);
    return this.resolveComponentInstance<T>(
      module,
      isFunction(token) ? (token as Type<any>).name : token,
      dependencyContext,
      wrapper,
      contextId,
    );
  }

  public resolveParamToken<T>(
    wrapper: InstanceWrapper<T>,
    param: Type<any> | string | symbol | any,
  ) {
    if (!param.forwardRef) {
      return param;
    }
    wrapper.forwardRef = true;
    return param.forwardRef();
  }

  public async resolveComponentInstance<T>(
    module: Module,
    name: any,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
  ): Promise<InstanceWrapper> {
    const providers = module.providers;
    const instanceWrapper = await this.lookupComponent(
      providers,
      module,
      { ...dependencyContext, name },
      wrapper,
      contextId,
    );
    return this.resolveComponentHost(module, instanceWrapper, contextId);
  }

  public async resolveComponentHost<T>(
    module: Module,
    instanceWrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
  ): Promise<InstanceWrapper> {
    const instanceHost = instanceWrapper.getInstanceByContextId(contextId);
    if (!instanceHost.isResolved && !instanceWrapper.forwardRef) {
      await this.loadProvider(instanceWrapper, module, contextId);
    }
    if (instanceWrapper.async) {
      const host = instanceWrapper.getInstanceByContextId(contextId);
      host.instance = await host.instance;
      instanceWrapper.setInstanceByContextId(contextId, host);
    }
    return instanceWrapper;
  }

  public async lookupComponent<T = any>(
    providers: Map<string, InstanceWrapper>,
    module: Module,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
  ): Promise<InstanceWrapper<T>> {
    const { name } = dependencyContext;
    const scanInExports = () =>
      this.lookupComponentInExports(
        dependencyContext,
        module,
        wrapper,
        contextId,
      );

    return providers.has(name) ? providers.get(name) : scanInExports();
  }

  public async lookupComponentInExports<T = any>(
    dependencyContext: InjectorDependencyContext,
    module: Module,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
  ) {
    const instanceWrapper = await this.lookupComponentInImports(
      module,
      dependencyContext.name,
      wrapper,
      [],
      contextId,
    );
    if (isNil(instanceWrapper)) {
      throw new UnknownDependenciesException(
        wrapper.name,
        dependencyContext,
        module,
      );
    }
    return instanceWrapper;
  }

  public async lookupComponentInImports(
    module: Module,
    name: any,
    wrapper: InstanceWrapper,
    moduleRegistry: any[] = [],
    contextId = STATIC_CONTEXT,
  ): Promise<any> {
    let instanceWrapperRef: InstanceWrapper = null;

    const imports: Set<Module> = module.imports || new Set();
    const children = [...imports.values()].filter(item => item);

    for (const relatedModule of children) {
      if (moduleRegistry.includes(relatedModule.id)) {
        continue;
      }
      moduleRegistry.push(relatedModule.id);
      const { providers, exports } = relatedModule;
      if (!exports.has(name) || !providers.has(name)) {
        const instanceRef = await this.lookupComponentInImports(
          relatedModule,
          name,
          wrapper,
          moduleRegistry,
          contextId,
        );
        if (instanceRef) {
          return instanceRef;
        }
        continue;
      }
      instanceWrapperRef = providers.get(name);

      const instanceHost = instanceWrapperRef.getInstanceByContextId(contextId);
      if (!instanceHost.isResolved && !instanceWrapperRef.forwardRef) {
        await this.loadProvider(instanceWrapperRef, relatedModule, contextId);
        break;
      }
    }
    return instanceWrapperRef;
  }

  public async resolveProperties<T>(
    wrapper: InstanceWrapper<T>,
    module: Module,
    inject?: InjectorDependency[],
    contextId = STATIC_CONTEXT,
  ): Promise<PropertyDependency[]> {
    if (!isNil(inject)) {
      return [];
    }
    const metadata = wrapper.getPropertiesMetadata();
    if (metadata) {
      const dependenciesHosts = await Promise.all(
        metadata.map(async ({ wrapper: item, key }) => ({
          key,
          host: await this.resolveComponentHost(item.host, item, contextId),
        })),
      );
      return dependenciesHosts.map(({ key, host }) => ({
        key,
        name: key,
        instance: host.getInstanceByContextId(contextId).instance,
      }));
    }
    const properties = this.reflectProperties(wrapper.metatype);
    const instances = await Promise.all(
      properties.map(async (item: PropertyDependency) => {
        try {
          const dependencyContext = {
            key: item.key,
            name: item.name as string,
          };
          const paramWrapper = await this.resolveSingleParam<T>(
            wrapper,
            item.name,
            dependencyContext,
            module,
            contextId,
          );
          if (!paramWrapper) {
            return undefined;
          }
          wrapper.addPropertiesMetadata(item.key, paramWrapper);
          const instanceHost = paramWrapper.getInstanceByContextId(contextId);
          return instanceHost.instance;
        } catch (err) {
          if (!item.isOptional) {
            throw err;
          }
          return undefined;
        }
      }),
    );
    return properties.map((item: PropertyDependency, index: number) => ({
      ...item,
      instance: instances[index],
    }));
  }

  public reflectProperties<T>(type: Type<T>): PropertyDependency[] {
    const properties = Reflect.getMetadata(PROPERTY_DEPS_METADATA, type) || [];
    const optionalKeys: string[] =
      Reflect.getMetadata(OPTIONAL_PROPERTY_DEPS_METADATA, type) || [];

    return properties.map((item: any) => ({
      ...item,
      name: item.type,
      isOptional: optionalKeys.includes(item.key),
    }));
  }

  public applyProperties<T = any>(
    instance: T,
    properties: PropertyDependency[],
  ): void {
    if (!isObject(instance)) {
      return undefined;
    }
    properties
      .filter(item => !isNil(item.instance))
      .forEach(item => (instance[item.key] = item.instance));
  }

  public async instantiateClass<T = any>(
    instances: any[],
    wrapper: InstanceWrapper,
    targetMetatype: InstanceWrapper,
    moduleId: string,
    contextId = STATIC_CONTEXT,
  ): Promise<T> {
    const { metatype, inject, name, scope } = wrapper;
    const instanceHost = targetMetatype.getInstanceByContextId(contextId);
    const instanceKey = moduleId + name;

    if (isNil(inject)) {
      const targetInstance = wrapper.getInstanceByContextId(contextId);
      targetInstance.instance = wrapper.forwardRef
        ? Object.assign(targetInstance.instance, new metatype(...instances))
        : new metatype(...instances);

      if (scope === Scope.LAZY_ASYNC) {
        this.mergeAsyncProxy(
          instances,
          targetInstance,
          instanceKey,
          metatype,
          (...args: any[]) => new metatype(...args),
        );
      }
    } else {
      const factoryReturnValue = ((targetMetatype.metatype as any) as Function)(
        ...instances,
      );
      instanceHost.instance = await factoryReturnValue;
      if (scope === Scope.LAZY_ASYNC) {
        this.mergeAsyncProxy(
          instances,
          instanceHost,
          instanceKey,
          metatype,
          (...args: any[]) =>
            ((targetMetatype.metatype as any) as Function)(...args),
        );
      }
    }
    instanceHost.isResolved = true;
    return instanceHost.instance;
  }

  mergeAsyncProxy(
    instances: any[],
    targetInstance: InstancePerContext<any>,
    instanceKey: string,
    metatype: Type<any>,
    factory: (...intances: any[]) => any,
  ) {
    const asyncContext = AsyncContext.getInstance();
    asyncContext.set(instanceKey, targetInstance.instance);

    const proxy = (target: unknown, property: string | number | symbol) => {
      if (!(property in (target as object))) {
        return;
      }
      const cachedInstance = asyncContext.get(instanceKey);
      if (cachedInstance) {
        return cachedInstance[property];
      }
      const value = factory(...instances);
      asyncContext.set(instanceKey, value);
      return value[property];
    };
    targetInstance.instance = new Proxy(targetInstance.instance, {
      get: proxy,
      set: proxy,
    });
  }

  async loadControllerPerContext<T>(
    instance: Controller,
    modulesContainer: ModulesContainer,
    moduleKey: string,
    ctx: ContextId,
  ): Promise<T> {
    const module = modulesContainer.get(moduleKey);

    const { controllers } = module;
    const controller = controllers.get(instance.constructor.name);
    await this.loadInstance(controller, controllers, module, ctx);

    const wrapper = controller.getInstanceByContextId(ctx);
    return wrapper && (wrapper.instance as T);
  }
}
