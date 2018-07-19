import { INestApplicationContext, OnModuleInit } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces/type.interface';
import {
  isFunction,
  isNil,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';
import { UnknownElementException } from './errors/exceptions/unknown-element.exception';
import { UnknownModuleException } from './errors/exceptions/unknown-module.exception';
import { InstanceWrapper, NestContainer } from './injector/container';
import { Module } from './injector/module';
import { ModuleTokenFactory } from './injector/module-token-factory';

export class NestApplicationContext implements INestApplicationContext {
  private readonly moduleTokenFactory = new ModuleTokenFactory();
  private contextModuleFixture: Partial<Module>;

  constructor(
    protected readonly container: NestContainer,
    private readonly scope: Type<any>[],
    protected contextModule: Module,
  ) {}

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

  public get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    options: { strict: boolean } = { strict: false },
  ): TResult {
    if (!(options && options.strict)) {
      return this.find<TInput, TResult>(typeOrToken);
    }
    return this.findInstanceByPrototypeOrToken<TInput, TResult>(
      typeOrToken,
      this.contextModule,
    );
  }

  public find<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
  ): TResult {
    this.initFlattenModule();
    return this.findInstanceByPrototypeOrToken<TInput, TResult>(
      typeOrToken,
      this.contextModuleFixture,
    );
  }

  public async init(): Promise<this> {
    await this.callInitHook();
    return this;
  }

  protected async callInitHook(): Promise<any> {
    const modules = this.container.getModules();
    await Promise.all(
      iterate(modules.values()).map(
        async module => await this.callModuleInitHook(module),
      ),
    );
  }

  protected async callModuleInitHook(module: Module): Promise<any> {
    const components = [...module.routes, ...module.components];
    await Promise.all(
      iterate(components)
        .map(([key, { instance }]) => instance)
        .filter(instance => !isNil(instance))
        .filter(this.hasOnModuleInitHook)
        .map(async instance => await (instance as OnModuleInit).onModuleInit()),
    );
  }

  protected hasOnModuleInitHook(instance: any): instance is OnModuleInit {
    return !isUndefined((instance as OnModuleInit).onModuleInit);
  }

  private findInstanceByPrototypeOrToken<TInput = any, TResult = TInput>(
    metatypeOrToken: Type<TInput> | string | symbol,
    contextModule,
  ): TResult {
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

  private initFlattenModule() {
    if (this.contextModuleFixture) {
      return undefined;
    }
    const modules = this.container.getModules();
    const initialValue = {
      components: [],
      routes: [],
      injectables: [],
    };
    this.contextModuleFixture = [...modules.values()].reduce(
      (flatten, curr) => ({
        components: [...flatten.components, ...curr.components],
        routes: [...flatten.routes, ...curr.routes],
        injectables: [...flatten.injectables, ...curr.injectables],
      }),
      initialValue,
    ) as any;
  }
}
