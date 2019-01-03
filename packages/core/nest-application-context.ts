import {
  INestApplicationContext,
  Logger,
  LoggerService,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { isNil, isUndefined } from '@nestjs/common/utils/shared.utils';
import { InstanceWrapper } from 'injector/instance-wrapper';
import iterate from 'iterare';
import { UnknownModuleException } from './errors/exceptions/unknown-module.exception';
import { NestContainer } from './injector/container';
import { ContainerScanner } from './injector/container-scanner';
import { Module } from './injector/module';
import { ModuleTokenFactory } from './injector/module-token-factory';
import { callModuleInitHook } from './hooks/on-module-init.hook';
import { callModuleBootstrapHook } from './hooks/on-app-bootstrap.hook';
import { callModuleDestroyHook } from './hooks/on-module-destroy.hook';

export class NestApplicationContext implements INestApplicationContext {
  private readonly moduleTokenFactory = new ModuleTokenFactory();
  private readonly containerScanner: ContainerScanner;

  constructor(
    protected readonly container: NestContainer,
    private readonly scope: Type<any>[] = [],
    private contextModule: Module = null,
  ) {
    this.containerScanner = new ContainerScanner(container);
  }

  public selectContextModule() {
    const modules = this.container.getModules().values();
    this.contextModule = modules.next().value;
  }

  public select<T>(module: Type<T>): INestApplicationContext {
    const modules = this.container.getModules();
    const moduleMetatype = this.contextModule.metatype;
    const scope = this.scope.concat(moduleMetatype);

    const token = this.moduleTokenFactory.create(module, scope);
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
    await this.callBootstrapHook();
    return this;
  }

  public async close(): Promise<void> {
    await this.callDestroyHook();
  }

  public useLogger(logger: LoggerService) {
    Logger.overrideLogger(logger);
  }

  protected async callInitHook(): Promise<any> {
    const modulesContainer = this.container.getModules();
    for (const module of [...modulesContainer.values()].reverse()) {
      await callModuleInitHook(module);
    }
  }

  protected async callDestroyHook(): Promise<any> {
    const modulesContainer = this.container.getModules();
    for (const module of modulesContainer.values()) {
      await callModuleDestroyHook(module);
    }
  }

  protected async callBootstrapHook(): Promise<any> {
    const modulesContainer = this.container.getModules();
    for (const module of [...modulesContainer.values()].reverse()) {
      await callModuleBootstrapHook(module);
    }
  }

  protected find<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
  ): TResult {
    return this.containerScanner.find<TInput, TResult>(typeOrToken);
  }

  protected findInstanceByPrototypeOrToken<TInput = any, TResult = TInput>(
    metatypeOrToken: Type<TInput> | string | symbol,
    contextModule: Partial<Module>,
  ): TResult {
    return this.containerScanner.findInstanceByPrototypeOrToken<
      TInput,
      TResult
    >(metatypeOrToken, contextModule);
  }
}
