import iterate from 'iterare';
import { ModuleTokenFactory } from './injector/module-token-factory';
import { NestContainer, InstanceWrapper } from './injector/container';
import { Type } from '@nestjs/common/interfaces/type.interface';
import {
  isFunction,
  isNil,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { INestApplicationContext, OnModuleInit } from '@nestjs/common';
import { Module } from './injector/module';
import { UnknownModuleException } from './errors/exceptions/unknown-module.exception';
import { UnknownElementException } from './errors/exceptions/unknown-element.exception';

export class NestApplicationContext implements INestApplicationContext {
  private readonly moduleTokenFactory = new ModuleTokenFactory();

  constructor(
    protected readonly container: NestContainer,
    private readonly scope: Type<any>[],
    protected contextModule: Module,
    isInitialized = true,
  ) {
    !isInitialized && this.callInitHook();
  }

  public selectContextModule() {
    const modules = this.container.getModules().values();
    this.contextModule = modules.next().value;
  }

  public select<T>(module: Type<T>): INestApplicationContext {
    const modules = this.container.getModules();
    const moduleMetatype = this.contextModule.metatype;
    const scope = this.scope.concat(moduleMetatype);

    const token = this.moduleTokenFactory.create(module as any, scope);
    const selectedModule = modules.get(token);
    if (!selectedModule) {
      throw new UnknownModuleException();
    }
    return new NestApplicationContext(this.container, scope, selectedModule);
  }

  public get<T>(typeOrToken: Type<T> | string | symbol): T | null {
    return this.findInstanceByPrototypeOrToken<T>(
      typeOrToken,
      this.contextModule,
    );
  }

  public find<T>(typeOrToken: Type<T> | string | symbol): T | null {
    const modules = this.container.getModules();
    const flattenModule = [...modules.values()].reduce(
      (flatten, curr) => ({
        components: [...flatten.components, ...curr.components],
        routes: [...flatten.routes, ...curr.routes],
        injectables: [...flatten.injectables, ...curr.injectables],
      }),
      {
        components: [],
        routes: [],
        injectables: [],
      },
    );
    return this.findInstanceByPrototypeOrToken<T>(typeOrToken, flattenModule);
  }

  protected callInitHook() {
    const modules = this.container.getModules();
    modules.forEach(module => {
      this.callModuleInitHook(module);
    });
  }

  protected callModuleInitHook(module: Module) {
    const components = [...module.routes, ...module.components];
    iterate(components)
      .map(([key, { instance }]) => instance)
      .filter(instance => !isNil(instance))
      .filter(this.hasOnModuleInitHook)
      .forEach(instance => (instance as OnModuleInit).onModuleInit());
  }

  protected hasOnModuleInitHook(instance: any): instance is OnModuleInit {
    return !isUndefined((instance as OnModuleInit).onModuleInit);
  }

  private findInstanceByPrototypeOrToken<T>(
    metatypeOrToken: Type<T> | string | symbol,
    contextModule,
  ): T | null {
    const dependencies = new Map([
      ...contextModule.components,
      ...contextModule.routes,
      ...contextModule.injectables,
    ]);
    const name = isFunction(metatypeOrToken)
      ? (metatypeOrToken as any).name
      : metatypeOrToken;
    const instanceWrapper = dependencies.get(name);
    if (!instanceWrapper) {
      throw new UnknownElementException();
    }
    return (instanceWrapper as InstanceWrapper<any>).instance;
  }
}
