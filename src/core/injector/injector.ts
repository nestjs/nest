import 'reflect-metadata';
import { InstanceWrapper } from './container';
import { UnknownDependenciesException } from '../errors/exceptions/unknown-dependencies.exception';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { Module } from './module';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { MiddlewareWrapper } from '../middlewares/container';
import {
  isUndefined,
  isNil,
  isFunction,
} from '@nestjs/common/utils/shared.utils';
import {
  PARAMTYPES_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from '@nestjs/common/constants';
import { UndefinedDependencyException } from './../errors/exceptions/undefined-dependency.exception';

export class Injector {
  public async loadInstanceOfMiddleware(
    wrapper: MiddlewareWrapper,
    collection: Map<string, MiddlewareWrapper>,
    module: Module,
  ) {
    const { metatype } = wrapper;
    const currentMetatype = collection.get(metatype.name);
    if (currentMetatype.instance !== null) return;

    await this.resolveConstructorParams(
      wrapper as any,
      module,
      null,
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
    if (!collection) return null;

    const target = collection.get(name);
    if (target.isResolved || !isNil(target.inject) || !metatype.prototype)
      return null;

    collection.set(name, {
      ...collection.get(name),
      instance: Object.create(metatype.prototype),
    });
  }

  public async loadInstanceOfComponent(
    wrapper: InstanceWrapper<Injectable>,
    module: Module,
    context: Module[] = [],
  ) {
    const components = module.components;
    await this.loadInstance<Injectable>(wrapper, components, module, context);
  }

  public applyDoneSubject<T>(wrapper: InstanceWrapper<T>): () => void {
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
    context: Module[] = [],
  ) {
    if (wrapper.isPending) {
      return await wrapper.done$;
    }
    const done = this.applyDoneSubject(wrapper);
    const { metatype, name, inject } = wrapper;
    const currentMetatype = collection.get(name);
    if (isUndefined(currentMetatype)) {
      throw new RuntimeException();
    }
    if (currentMetatype.isResolved) return null;

    await this.resolveConstructorParams<T>(
      wrapper,
      module,
      inject,
      context,
      async instances => {
        if (isNil(inject)) {
          currentMetatype.instance = Object.assign(
            currentMetatype.instance,
            new metatype(...instances),
          );
        } else {
          const factoryResult = currentMetatype.metatype(...instances);
          currentMetatype.instance = await this.resolveFactoryInstance(
            factoryResult,
          );
        }
        currentMetatype.isResolved = true;
        done();
      },
    );
  }

  public async resolveConstructorParams<T>(
    wrapper: InstanceWrapper<T>,
    module: Module,
    inject: any[],
    context: Module[],
    callback: (args) => void,
  ) {
    let isResolved = true;
    const args = isNil(inject)
      ? this.reflectConstructorParams(wrapper.metatype)
      : inject;

    const instances = await Promise.all(
      args.map(async (param, index) => {
        const paramWrapper = await this.resolveSingleParam<T>(
          wrapper,
          param,
          { index, length: args.length },
          module,
          context,
        );
        if (!paramWrapper.isResolved && !paramWrapper.forwardRef) {
          isResolved = false;
        }
        return paramWrapper.instance;
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

  public reflectSelfParams<T>(type: Type<T>): any[] {
    return Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, type) || [];
  }

  public async resolveSingleParam<T>(
    wrapper: InstanceWrapper<T>,
    param: Type<any> | string | symbol | any,
    { index, length }: { index: number; length: number },
    module: Module,
    context: Module[],
  ) {
    if (isUndefined(param)) {
      throw new UndefinedDependencyException(wrapper.name, index, length);
    }
    const token = this.resolveParamToken(wrapper, param);
    return await this.resolveComponentInstance<T>(
      module,
      isFunction(token) ? (token as Type<any>).name : token,
      { index, length },
      wrapper,
      context,
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
    { index, length }: { index: number; length: number },
    wrapper: InstanceWrapper<T>,
    context: Module[],
  ) {
    const components = module.components;
    const instanceWrapper = await this.scanForComponent(
      components,
      module,
      { name, index, length },
      wrapper,
      context,
    );
    if (!instanceWrapper.isResolved && !instanceWrapper.forwardRef) {
      await this.loadInstanceOfComponent(instanceWrapper, module);
    }
    if (instanceWrapper.async) {
      instanceWrapper.instance = await instanceWrapper.instance;
    }
    return instanceWrapper;
  }

  public async scanForComponent(
    components: Map<string, any>,
    module: Module,
    { name, index, length }: { name: any; index: number; length: number },
    { metatype },
    context: Module[] = [],
  ) {
    const component = await this.scanForComponentInScopes(
      context,
      { name, index, length },
      metatype,
    );
    if (component) {
      return component;
    }
    const scanInExports = () =>
      this.scanForComponentInExports(
        components,
        { name, index, length },
        module,
        metatype,
        context,
      );
    return components.has(name) ? components.get(name) : await scanInExports();
  }

  public async scanForComponentInExports(
    components: Map<string, any>,
    { name, index, length }: { name: any; index: number; length: number },
    module: Module,
    metatype,
    context: Module[] = [],
  ) {
    const instanceWrapper = await this.scanForComponentInRelatedModules(
      module,
      name,
      context,
    );
    if (isNil(instanceWrapper)) {
      throw new UnknownDependenciesException(metatype.name, index, length);
    }
    return instanceWrapper;
  }

  public async scanForComponentInScopes(
    context: Module[],
    { name, index, length }: { name: any; index: number; length: number },
    metatype,
  ) {
    context = context || [];
    for (const ctx of context) {
      const component = await this.scanForComponentInScope(
        ctx,
        { name, index, length },
        metatype,
      );
      if (component) return component;
    }
    return null;
  }

  public async scanForComponentInScope(
    context: Module,
    { name, index, length }: { name: any; index: number; length: number },
    metatype,
  ) {
    try {
      const component = await this.scanForComponent(
        context.components,
        context,
        { name, index, length },
        { metatype },
        null,
      );
      if (!component.isResolved && !component.forwardRef) {
        await this.loadInstanceOfComponent(component, context);
      }
      return component;
    } catch (e) {
      if (e instanceof RuntimeException) {
        return null;
      }
      throw e;
    }
  }

  public async scanForComponentInRelatedModules(
    module: Module,
    name: any,
    context: Module[],
  ) {
    let component = null;
    const relatedModules = module.relatedModules || [];

    for (const relatedModule of this.flatMap([...relatedModules.values()])) {
      const { components, exports } = relatedModule;
      const isInScope = context === null;
      if ((!exports.has(name) && !isInScope) || !components.has(name)) {
        continue;
      }
      component = components.get(name);
      if (!component.isResolved && !component.forwardRef) {
        const ctx = isInScope ? [module] : [].concat(context, module);
        await this.loadInstanceOfComponent(component, relatedModule, ctx);
        break;
      }
    }
    return component;
  }

  public async resolveFactoryInstance(factoryResult): Promise<any> {
    if (!(factoryResult instanceof Promise)) {
      return factoryResult;
    }
    const result = await factoryResult;
    return result;
  }

  public flatMap(modules: Module[]): Module[] {
    return modules.concat.apply(
      modules,
      modules.map((module: Module) => {
        const { relatedModules, exports } = module;
        return this.flatMap(
          [...relatedModules.values()]
            .filter(related => !!related)
            .filter(related => {
              const { metatype } = related;
              return exports.has(metatype.name);
            }),
        );
      }),
    );
  }
}
