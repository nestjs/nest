import {
  OPTIONAL_DEPS_METADATA,
  PARAMTYPES_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from '@nestjs/common/constants';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import {
  isFunction,
  isNil,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { UndefinedDependencyException } from '../errors/exceptions/undefined-dependency.exception';
import { UnknownDependenciesException } from '../errors/exceptions/unknown-dependencies.exception';
import { MiddlewareWrapper } from '../middleware/container';
import { InstanceWrapper } from './container';
import { Module } from './module';

/**
 * The type of an injectable dependency
 */
export type InjectorDependency = Type<any> | Function | string;

/**
 * Context of a dependency which gets injected by
 * the injector
 */
export interface InjectorDependencyContext {
  /**
   * The name of the function or injection token
   */
  name?: string;
  /**
   * The index of the dependency which gets injected
   * from the dependencies array
   */
  index: number;
  /**
   * The dependency array which gets injected
   */
  dependencies: InjectorDependency[];
}

export class Injector {
  public async loadInstanceOfMiddleware(
    wrapper: MiddlewareWrapper,
    collection: Map<string, MiddlewareWrapper>,
    module: Module,
  ) {
    const { metatype } = wrapper;
    const currentMetatype = collection.get(metatype.name);
    if (currentMetatype.instance !== null) {
      return;
    }
    await this.resolveConstructorParams(
      wrapper as any,
      module,
      null,
      instances => {
        collection.set(metatype.name, {
          instance: new metatype(...instances),
          metatype,
        });
      },
    );
  }

  public async loadInstanceOfRoute(
    wrapper: InstanceWrapper<Controller>,
    module: Module,
  ) {
    const routes = module.routes;
    await this.loadInstance<Controller>(wrapper, routes, module);
  }

  public async loadInstanceOfInjectable(
    wrapper: InstanceWrapper<Controller>,
    module: Module,
  ) {
    const injectables = module.injectables;
    await this.loadInstance<Controller>(wrapper, injectables, module);
  }

  public loadPrototypeOfInstance<T>(
    { metatype, name }: InstanceWrapper<T>,
    collection: Map<string, InstanceWrapper<T>>,
  ) {
    if (!collection) {
      return null;
    }
    const target = collection.get(name);
    if (target.isResolved || !isNil(target.inject) || !metatype.prototype) {
      return null;
    }
    collection.set(name, {
      ...collection.get(name),
      instance: Object.create(metatype.prototype),
    });
  }

  public async loadInstanceOfComponent(
    wrapper: InstanceWrapper<Injectable>,
    module: Module,
  ) {
    const components = module.components;
    await this.loadInstance<Injectable>(wrapper, components, module);
  }

  public applyDoneHook<T>(wrapper: InstanceWrapper<T>): () => void {
    let done: () => void;
    wrapper.done$ = new Promise<void>((resolve, reject) => {
      done = resolve;
    });
    wrapper.isPending = true;
    return done;
  }

  public async loadInstance<T>(
    wrapper: InstanceWrapper<T>,
    collection,
    module: Module,
  ) {
    if (wrapper.isPending) {
      return wrapper.done$;
    }
    const done = this.applyDoneHook(wrapper);
    const { name, inject } = wrapper;

    const targetMetatype = collection.get(name);
    if (isUndefined(targetMetatype)) {
      throw new RuntimeException();
    }
    if (targetMetatype.isResolved) {
      return;
    }
    await this.resolveConstructorParams<T>(
      wrapper,
      module,
      inject,
      async instances =>
        this.instantiateClass(instances, wrapper, targetMetatype, done),
    );
  }

  public async resolveConstructorParams<T>(
    wrapper: InstanceWrapper<T>,
    module: Module,
    inject: InjectorDependency[],
    callback: (args) => void,
  ) {
    let isResolved = true;

    const dependencies = isNil(inject)
      ? this.reflectConstructorParams(wrapper.metatype)
      : inject;
    const optionalDependenciesIds = isNil(inject)
      ? this.reflectOptionalParams(wrapper.metatype)
      : [];

    const instances = await Promise.all(
      dependencies.map(async (param, index) => {
        try {
          const paramWrapper = await this.resolveSingleParam<T>(
            wrapper,
            param,
            { index, dependencies },
            module,
          );
          if (!paramWrapper.isResolved && !paramWrapper.forwardRef) {
            isResolved = false;
          }
          return paramWrapper.instance;
        } catch (err) {
          const isOptional = optionalDependenciesIds.includes(index);
          if (!isOptional) {
            throw err;
          }
          return undefined;
        }
      }),
    );
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
  ) {
    if (isUndefined(param)) {
      throw new UndefinedDependencyException(wrapper.name, dependencyContext, module);
    }
    const token = this.resolveParamToken(wrapper, param);
    return this.resolveComponentInstance<T>(
      module,
      isFunction(token) ? (token as Type<any>).name : token,
      dependencyContext,
      wrapper,
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
  ) {
    const components = module.components;
    const instanceWrapper = await this.lookupComponent(
      components,
      module,
      { name, ...dependencyContext },
      wrapper,
    );
    if (!instanceWrapper.isResolved && !instanceWrapper.forwardRef) {
      await this.loadInstanceOfComponent(instanceWrapper, module);
    }
    if (instanceWrapper.async) {
      instanceWrapper.instance = await instanceWrapper.instance;
    }
    return instanceWrapper;
  }

  public async lookupComponent<T = any>(
    components: Map<string, any>,
    module: Module,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
  ) {
    const { name } = dependencyContext;
    const scanInExports = () =>
      this.lookupComponentInExports(dependencyContext, module, wrapper);
    return components.has(name) ? components.get(name) : scanInExports();
  }

  public async lookupComponentInExports<T = any>(
    dependencyContext: InjectorDependencyContext,
    module: Module,
    wrapper: InstanceWrapper<T>,
  ) {
    const instanceWrapper = await this.lookupComponentInRelatedModules(
      module,
      dependencyContext.name,
    );
    if (isNil(instanceWrapper)) {
      throw new UnknownDependenciesException(wrapper.name, dependencyContext, module);
    }
    return instanceWrapper;
  }

  public async lookupComponentInRelatedModules(
    module: Module,
    name: any,
    moduleRegistry = [],
  ) {
    let componentRef = null;

    const relatedModules: Set<Module> = module.relatedModules || new Set();
    const children = [...relatedModules.values()].filter(item => item);
    for (const relatedModule of children) {
      if (moduleRegistry.includes(relatedModule.id)) {
        continue;
      }
      moduleRegistry.push(relatedModule.id);
      const { components, exports } = relatedModule;
      if (!exports.has(name) || !components.has(name)) {
        const instanceRef = await this.lookupComponentInRelatedModules(
          relatedModule,
          name,
          moduleRegistry,
        );
        if (instanceRef) {
          return instanceRef;
        }
        continue;
      }
      componentRef = components.get(name);
      if (!componentRef.isResolved && !componentRef.forwardRef) {
        await this.loadInstanceOfComponent(componentRef, relatedModule);
        break;
      }
    }
    return componentRef;
  }

  public async instantiateClass(
    instances: any[],
    wrapper: InstanceWrapper<any>,
    targetMetatype: InstanceWrapper<any>,
    done: Function,
  ) {
    const { metatype, inject } = wrapper;
    if (isNil(inject)) {
      targetMetatype.instance = Object.assign(
        targetMetatype.instance,
        new metatype(...instances),
      );
    } else {
      const factoryResult = ((targetMetatype.metatype as any) as Function)(
        ...instances,
      );
      targetMetatype.instance = await factoryResult;
    }
    targetMetatype.isResolved = true;
    done();
  }
}
