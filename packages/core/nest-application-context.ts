import {
  INestApplicationContext,
  Logger,
  LoggerService,
  LogLevel,
  ShutdownSignal,
} from '@nestjs/common';
import {
  Abstract,
  DynamicModule,
  GetOrResolveOptions,
  Type,
} from '@nestjs/common/interfaces';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import { MESSAGES } from './constants';
import { UnknownModuleException } from './errors/exceptions';
import { createContextId } from './helpers/context-id-factory';
import {
  callAppShutdownHook,
  callBeforeAppShutdownHook,
  callModuleBootstrapHook,
  callModuleDestroyHook,
  callModuleInitHook,
} from './hooks';
import { AbstractInstanceResolver } from './injector/abstract-instance-resolver';
import { ModuleCompiler } from './injector/compiler';
import { NestContainer } from './injector/container';
import { Injector } from './injector/injector';
import { InstanceLinksHost } from './injector/instance-links-host';
import { ContextId } from './injector/instance-wrapper';
import { Module } from './injector/module';

/**
 * @publicApi
 */
export class NestApplicationContext
  extends AbstractInstanceResolver
  implements INestApplicationContext
{
  protected isInitialized = false;
  protected readonly injector = new Injector();

  private shouldFlushLogsOnOverride = false;
  private readonly activeShutdownSignals = new Array<string>();
  private readonly moduleCompiler = new ModuleCompiler();
  private shutdownCleanupRef?: (...args: unknown[]) => unknown;
  private _instanceLinksHost: InstanceLinksHost;
  private _moduleRefsByDistance?: Array<Module>;

  protected get instanceLinksHost() {
    if (!this._instanceLinksHost) {
      this._instanceLinksHost = new InstanceLinksHost(this.container);
    }
    return this._instanceLinksHost;
  }

  constructor(
    protected readonly container: NestContainer,
    private readonly scope = new Array<Type<any>>(),
    private contextModule: Module = null,
  ) {
    super();
  }

  public selectContextModule() {
    const modules = this.container.getModules().values();
    this.contextModule = modules.next().value;
  }

  /**
   * Allows navigating through the modules tree, for example, to pull out a specific instance from the selected module.
   * @returns {INestApplicationContext}
   */
  public select<T>(
    moduleType: Type<T> | DynamicModule,
  ): INestApplicationContext {
    const modulesContainer = this.container.getModules();
    const contextModuleCtor = this.contextModule.metatype;
    const scope = this.scope.concat(contextModuleCtor);

    const moduleTokenFactory = this.container.getModuleTokenFactory();
    const { type, dynamicMetadata } =
      this.moduleCompiler.extractMetadata(moduleType);
    const token = moduleTokenFactory.create(type, dynamicMetadata);

    const selectedModule = modulesContainer.get(token);
    if (!selectedModule) {
      throw new UnknownModuleException();
    }
    return new NestApplicationContext(this.container, scope, selectedModule);
  }

  /**
   * Retrieves an instance of either injectable or controller, otherwise, throws exception.
   * @returns {TResult}
   */
  public get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
  ): TResult;
  /**
   * Retrieves an instance of either injectable or controller, otherwise, throws exception.
   * @returns {TResult}
   */
  public get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options: {
      strict?: boolean;
      each?: undefined | false;
    },
  ): TResult;
  /**
   * Retrieves a list of instances of either injectables or controllers, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options: {
      strict?: boolean;
      each: true;
    },
  ): Array<TResult>;
  /**
   * Retrieves an instance (or a list of instances) of either injectable or controller, otherwise, throws exception.
   * @returns {TResult | Array<TResult>}
   */
  public get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    options: GetOrResolveOptions = { strict: false },
  ): TResult | Array<TResult> {
    return !(options && options.strict)
      ? this.find<TInput, TResult>(typeOrToken, options)
      : this.find<TInput, TResult>(typeOrToken, {
          moduleId: this.contextModule?.id,
          each: options.each,
        });
  }

  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: {
      id: number;
    },
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: {
      id: number;
    },
    options?: {
      strict?: boolean;
      each?: undefined | false;
    },
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instances of either injectables or controllers, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: {
      id: number;
    },
    options?: {
      strict?: boolean;
      each: true;
    },
  ): Promise<Array<TResult>>;
  /**
   * Resolves transient or request-scoped instance (or a list of instances) of either injectable or controller, otherwise, throws exception.
   * @returns {Promise<TResult | Array<TResult>>}
   */
  public resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    contextId = createContextId(),
    options: GetOrResolveOptions = { strict: false },
  ): Promise<TResult | Array<TResult>> {
    return this.resolvePerContext<TInput, TResult>(
      typeOrToken,
      this.contextModule,
      contextId,
      options,
    );
  }

  /**
   * Registers the request/context object for a given context ID (DI container sub-tree).
   * @returns {void}
   */
  public registerRequestByContextId<T = any>(request: T, contextId: ContextId) {
    this.container.registerRequestProvider(request, contextId);
  }

  /**
   * Initializes the Nest application.
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

  /**
   * Terminates the application
   * @returns {Promise<void>}
   */
  public async close(): Promise<void> {
    await this.callDestroyHook();
    await this.callBeforeShutdownHook();
    await this.dispose();
    await this.callShutdownHook();
    this.unsubscribeFromProcessSignals();
  }

  /**
   * Sets custom logger service.
   * Flushes buffered logs if auto flush is on.
   * @returns {void}
   */
  public useLogger(logger: LoggerService | LogLevel[] | false) {
    Logger.overrideLogger(logger);

    if (this.shouldFlushLogsOnOverride) {
      this.flushLogs();
    }
  }

  /**
   * Prints buffered logs and detaches buffer.
   * @returns {void}
   */
  public flushLogs() {
    Logger.flush();
  }

  /**
   * Define that it must flush logs right after defining a custom logger.
   */
  public flushLogsOnOverride() {
    this.shouldFlushLogsOnOverride = true;
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

    signals = iterate(signals)
      .map((signal: string) => signal.toString().toUpperCase().trim())
      // filter out the signals which is already listening to
      .filter(signal => !this.activeShutdownSignals.includes(signal))
      .toArray();

    this.listenToShutdownSignals(signals);
    return this;
  }

  protected async dispose(): Promise<void> {
    // Nest application context has no server
    // to dispose, therefore just call a noop
    return Promise.resolve();
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
          (err as Error)?.stack,
          NestApplicationContext.name,
        );
        process.exit(1);
      }
    };
    this.shutdownCleanupRef = cleanup as (...args: unknown[]) => unknown;

    signals.forEach((signal: string) => {
      this.activeShutdownSignals.push(signal);
      process.on(signal as any, cleanup);
    });
  }

  /**
   * Unsubscribes from shutdown signals (process events)
   */
  protected unsubscribeFromProcessSignals() {
    if (!this.shutdownCleanupRef) {
      return;
    }
    this.activeShutdownSignals.forEach(signal => {
      process.removeListener(signal, this.shutdownCleanupRef);
    });
  }

  /**
   * Calls the `onModuleInit` function on the registered
   * modules and its children.
   */
  protected async callInitHook(): Promise<void> {
    const modulesSortedByDistance = this.getModulesSortedByDistance();
    for (const module of modulesSortedByDistance) {
      await callModuleInitHook(module);
    }
  }

  /**
   * Calls the `onModuleDestroy` function on the registered
   * modules and its children.
   */
  protected async callDestroyHook(): Promise<void> {
    const modulesSortedByDistance = this.getModulesSortedByDistance();
    for (const module of modulesSortedByDistance) {
      await callModuleDestroyHook(module);
    }
  }

  /**
   * Calls the `onApplicationBootstrap` function on the registered
   * modules and its children.
   */
  protected async callBootstrapHook(): Promise<void> {
    const modulesSortedByDistance = this.getModulesSortedByDistance();
    for (const module of modulesSortedByDistance) {
      await callModuleBootstrapHook(module);
    }
  }

  /**
   * Calls the `onApplicationShutdown` function on the registered
   * modules and children.
   */
  protected async callShutdownHook(signal?: string): Promise<void> {
    const modulesSortedByDistance = this.getModulesSortedByDistance();
    for (const module of modulesSortedByDistance) {
      await callAppShutdownHook(module, signal);
    }
  }

  /**
   * Calls the `beforeApplicationShutdown` function on the registered
   * modules and children.
   */
  protected async callBeforeShutdownHook(signal?: string): Promise<void> {
    const modulesSortedByDistance = this.getModulesSortedByDistance();
    for (const module of modulesSortedByDistance) {
      await callBeforeAppShutdownHook(module, signal);
    }
  }

  private getModulesSortedByDistance(): Module[] {
    if (this._moduleRefsByDistance) {
      return this._moduleRefsByDistance;
    }
    const modulesContainer = this.container.getModules();
    const compareFn = (a: Module, b: Module) => b.distance - a.distance;

    this._moduleRefsByDistance = Array.from(modulesContainer.values()).sort(
      compareFn,
    );
    return this._moduleRefsByDistance;
  }
}
