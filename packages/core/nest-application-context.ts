import {
  INestApplicationContext,
  Logger,
  LoggerService,
  ShutdownSignal,
} from '@nestjs/common';
import { Abstract } from '@nestjs/common/interfaces';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { MESSAGES } from './constants';
import { UnknownElementException } from './errors/exceptions/unknown-element.exception';
import { UnknownModuleException } from './errors/exceptions/unknown-module.exception';
import { createContextId } from './helpers';
import {
  callAppShutdownHook,
  callBeforeAppShutdownHook,
  callModuleBootstrapHook,
  callModuleDestroyHook,
  callModuleInitHook,
} from './hooks';
import { ContextId } from './injector';
import { NestContainer } from './injector/container';
import { ContainerScanner } from './injector/container-scanner';
import { Injector } from './injector/injector';
import { InstanceWrapper } from './injector/instance-wrapper';
import { Module } from './injector/module';

/**
 * @publicApi
 */
export class NestApplicationContext implements INestApplicationContext {
  protected isInitialized = false;
  protected readonly injector = new Injector();
  private readonly activeShutdownSignals = new Array<string>();
  private readonly containerScanner: ContainerScanner;

  constructor(
    protected readonly container: NestContainer,
    private readonly scope = new Array<Type<any>>(),
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
    const moduleTokenFactory = this.container.getModuleTokenFactory();

    const token = moduleTokenFactory.create(module, scope);
    const selectedModule = modules.get(token);
    if (!selectedModule) {
      throw new UnknownModuleException();
    }
    return new NestApplicationContext(this.container, scope, selectedModule);
  }

  public get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    options: { strict: boolean } = { strict: false },
  ): TResult {
    if (!(options && options.strict)) {
      return this.find<TInput, TResult>(typeOrToken);
    }
    return this.findInstanceByToken<TInput, TResult>(
      typeOrToken,
      this.contextModule,
    );
  }

  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    contextId = createContextId(),
    options: { strict: boolean } = { strict: false },
  ): Promise<TResult> {
    return this.resolvePerContext(
      typeOrToken,
      this.contextModule,
      contextId,
      options,
    );
  }

  /**
   * Initalizes the Nest application.
   * Calls the Nest lifecycle events.
   *
   * @returns {Promise<this>} The NestApplicationContext instance as Promise
   */
  public async init(): Promise<this> {
    if (this.isInitialized) {
      return this;
    }
    await this.callInitHook();
    await this.callBootstrapHook();

    this.isInitialized = true;
    return this;
  }

  protected async dispose(): Promise<void> {
    // Nest application context has no server
    // to dispose, therefore just call a noop
    return Promise.resolve();
  }

  public async close(): Promise<void> {
    await this.callDestroyHook();
    await this.callBeforeShutdownHook();
    await this.dispose();
    await this.callShutdownHook();
  }

  public useLogger(logger: LoggerService) {
    Logger.overrideLogger(logger);
  }

  /**
   * Enables the usage of shutdown hooks. Will call the
   * `onApplicationShutdown` function of a provider if the
   * process receives a shutdown signal.
   *
   * @param {ShutdownSignal[]} [signals=[]] The system signals it should listen to
   *
   * @returns {this} The Nest application context instance
   */
  public enableShutdownHooks(signals: (ShutdownSignal | string)[] = []): this {
    if (isEmpty(signals)) {
      signals = Object.keys(ShutdownSignal).map(
        (key: string) => ShutdownSignal[key],
      );
    } else {
      // given signals array should be unique because
      // process shouldn't listen to the same signal more than once.
      signals = Array.from(new Set(signals));
    }

    signals = signals
      .map((signal: string) =>
        signal
          .toString()
          .toUpperCase()
          .trim(),
      )
      // filter out the signals which is already listening to
      .filter(signal => !this.activeShutdownSignals.includes(signal));

    this.listenToShutdownSignals(signals);
    return this;
  }

  /**
   * Listens to shutdown signals by listening to
   * process events
   *
   * @param {string[]} signals The system signals it should listen to
   */
  protected listenToShutdownSignals(signals: string[]) {
    const cleanup = async (signal: string) => {
      try {
        signals.forEach(sig => process.removeListener(sig, cleanup));
        await this.callDestroyHook();
        await this.callBeforeShutdownHook(signal);
        await this.dispose();
        await this.callShutdownHook(signal);
        process.kill(process.pid, signal);
      } catch (err) {
        Logger.error(
          MESSAGES.ERROR_DURING_SHUTDOWN,
          (err as Error).stack,
          NestApplicationContext.name,
        );
        process.exit(1);
      }
    };

    signals.forEach((signal: string) => {
      this.activeShutdownSignals.push(signal);
      process.on(signal as any, cleanup);
    });
  }

  /**
   * Calls the `onModuleInit` function on the registered
   * modules and its children.
   */
  protected async callInitHook(): Promise<void> {
    const modulesContainer = this.container.getModules();
    for (const module of [...modulesContainer.values()].reverse()) {
      await callModuleInitHook(module);
    }
  }

  /**
   * Calls the `onModuleDestroy` function on the registered
   * modules and its children.
   */
  protected async callDestroyHook(): Promise<void> {
    const modulesContainer = this.container.getModules();
    for (const module of modulesContainer.values()) {
      await callModuleDestroyHook(module);
    }
  }

  /**
   * Calls the `onApplicationBootstrap` function on the registered
   * modules and its children.
   */
  protected async callBootstrapHook(): Promise<void> {
    const modulesContainer = this.container.getModules();
    for (const module of [...modulesContainer.values()].reverse()) {
      await callModuleBootstrapHook(module);
    }
  }

  /**
   * Calls the `onApplicationShutdown` function on the registered
   * modules and children.
   */
  protected async callShutdownHook(signal?: string): Promise<void> {
    const modulesContainer = this.container.getModules();
    for (const module of [...modulesContainer.values()].reverse()) {
      await callAppShutdownHook(module, signal);
    }
  }

  /**
   * Calls the `beforeApplicationShutdown` function on the registered
   * modules and children.
   */
  protected async callBeforeShutdownHook(signal?: string): Promise<void> {
    const modulesContainer = this.container.getModules();
    for (const module of [...modulesContainer.values()].reverse()) {
      await callBeforeAppShutdownHook(module, signal);
    }
  }

  protected find<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
  ): TResult {
    return this.containerScanner.find<TInput, TResult>(typeOrToken);
  }

  protected findInstanceByToken<TInput = any, TResult = TInput>(
    metatypeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    contextModule: Partial<Module>,
  ): TResult {
    return this.containerScanner.findInstanceByToken<TInput, TResult>(
      metatypeOrToken,
      contextModule,
    );
  }

  protected async resolvePerContext<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    contextModule: Module,
    contextId: ContextId,
    options?: { strict: boolean },
  ): Promise<TResult> {
    let wrapper: InstanceWrapper, collection: Map<string, InstanceWrapper>;
    if (!(options && options.strict)) {
      [wrapper, collection] = this.containerScanner.getWrapperCollectionPair(
        typeOrToken,
      );
    } else {
      [
        wrapper,
        collection,
      ] = this.containerScanner.getWrapperCollectionPairByHost(
        typeOrToken,
        contextModule,
      );
    }
    const instance = await this.injector.loadPerContext(
      wrapper.instance,
      wrapper.host,
      collection,
      contextId,
    );
    if (!instance) {
      throw new UnknownElementException();
    }
    return instance;
  }
}
