import {
  INestApplicationContext,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { isNil, isUndefined } from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';
import { UnknownModuleException } from './errors/exceptions/unknown-module.exception';
import { NestContainer } from './injector/container';
import { Module } from './injector/module';
import { ModuleRef } from './injector/module-ref';
import { ModuleTokenFactory } from './injector/module-token-factory';

export class NestApplicationContext extends ModuleRef
  implements INestApplicationContext {
  private readonly moduleTokenFactory = new ModuleTokenFactory();

  constructor(
    container: NestContainer,
    private readonly scope: Type<any>[],
    protected contextModule: Module,
  ) {
    super(container);
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

  public async init(): Promise<this> {
    await this.callInitHook();
    return this;
  }

  public async close(): Promise<void> {
    await this.callDestroyHook();
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

  protected async callDestroyHook(): Promise<any> {
    const modules = this.container.getModules();
    await Promise.all(
      iterate(modules.values()).map(
        async module => await this.callModuleDestroyHook(module),
      ),
    );
  }

  protected async callModuleDestroyHook(module: Module): Promise<any> {
    const components = [...module.routes, ...module.components];
    await Promise.all(
      iterate(components)
        .map(([key, { instance }]) => instance)
        .filter(instance => !isNil(instance))
        .filter(this.hasOnModuleDestroyHook)
        .map(
          async instance =>
            await (instance as OnModuleDestroy).onModuleDestroy(),
        ),
    );
  }

  protected hasOnModuleDestroyHook(instance): instance is OnModuleDestroy {
    return !isUndefined((instance as OnModuleDestroy).onModuleDestroy);
  }
}
