import type {
  DynamicModule,
  ForwardReference,
  HttpServer,
  INestApplication,
  INestApplicationContext,
  INestMicroservice,
  ModuleMetadata,
  Type,
} from '@nestjs/common';
import { AbstractHttpAdapter } from './adapters/http-adapter.js';
import { ApplicationConfig } from './application-config.js';
import { MESSAGES } from './constants.js';
import { ExceptionsZone } from './errors/exceptions-zone.js';
import { loadAdapter } from './helpers/load-adapter.js';
import { rethrow } from './helpers/rethrow.js';
import { NestContainer } from './injector/container.js';
import { Injector } from './injector/injector.js';
import { InstanceLoader } from './injector/instance-loader.js';
import { GraphInspector } from './inspector/graph-inspector.js';
import { NoopGraphInspector } from './inspector/noop-graph-inspector.js';
import { UuidFactory, UuidFactoryMode } from './inspector/uuid-factory.js';
import { MetadataScanner } from './metadata-scanner.js';
import { NestApplicationContext } from './nest-application-context.js';
import { NestApplication } from './nest-application.js';
import { DependenciesScanner } from './scanner.js';
import {
  type NestMicroserviceOptions,
  type NestApplicationContextOptions,
  type SelectOptions,
  loadPackage,
  isFunction,
  isNil,
  isObject,
  isPlainObject,
} from '@nestjs/common/internal';
import {
  type NestApplicationOptions,
  ConsoleLogger,
  Logger,
  Module,
} from '@nestjs/common';

/**
 * Represents the entry (root) module type accepted by the NestFactory methods.
 *
 * Besides a module class, a dynamic module or a forward reference, it can be
 * plain module metadata (for example, `{ controllers: [AppController] }`),
 * from which Nest creates the root module.
 *
 * @publicApi
 */
export type IEntryNestModule =
  | Type<any>
  | DynamicModule
  | ForwardReference
  | ModuleMetadata
  | Promise<IEntryNestModule>;

type ApplicationFromAdapter<TAdapter extends AbstractHttpAdapter> =
  TAdapter extends AbstractHttpAdapter<any, any, any, infer TApplication>
    ? TApplication
    : INestApplication;

/**
 * @publicApi
 */
export class NestFactoryStatic {
  private readonly logger = new Logger('NestFactory', {
    timestamp: true,
  });
  private abortOnError = true;
  private autoFlushLogs = false;

  /**
   * Creates a Nest application and infers its type from the supplied adapter.
   * A contextual application type takes precedence when supplied.
   * Adapters typed as `AbstractHttpAdapter` or `any` use the fallback overloads.
   *
   * @param module Entry (root) application module class or module metadata
   * @param httpAdapter Adapter to proxy the request/response cycle to
   *    the underlying HTTP server
   * @param options List of options to initialize NestApplication
   */
  public async create<
    TAdapter extends AbstractHttpAdapter,
    T extends INestApplication = ApplicationFromAdapter<TAdapter>,
  >(
    module: IEntryNestModule,
    httpAdapter: TAdapter &
      (AbstractHttpAdapter extends TAdapter ? never : unknown),
    options?: NestApplicationOptions,
  ): Promise<T>;
  /**
   * Creates an instance of NestApplication.
   *
   * @param module Entry (root) application module class or module metadata
   * @param options List of options to initialize NestApplication
   *
   * @returns A promise that, when resolved,
   * contains a reference to the NestApplication instance.
   */
  public async create<T extends INestApplication = INestApplication>(
    module: IEntryNestModule,
    options?: NestApplicationOptions,
  ): Promise<T>;
  /**
   * Preserves the original adapter signature, including an explicit `never`
   * application type and the signatures seen by `Parameters` and `ReturnType`.
   */
  public async create<T extends INestApplication = INestApplication>(
    module: IEntryNestModule,
    httpAdapter: AbstractHttpAdapter,
    options?: NestApplicationOptions,
  ): Promise<T>;
  public async create<T extends INestApplication = INestApplication>(
    moduleCls: IEntryNestModule,
    serverOrOptions?: AbstractHttpAdapter | NestApplicationOptions,
    options?: NestApplicationOptions,
  ): Promise<T> {
    const [httpServer, appOptions] = this.isHttpServer(serverOrOptions!)
      ? [serverOrOptions, options]
      : [await this.createHttpAdapter(), serverOrOptions];

    const applicationConfig = new ApplicationConfig();
    const container = new NestContainer(applicationConfig, appOptions);
    const graphInspector = this.createGraphInspector(appOptions!, container);

    this.setAbortOnError(serverOrOptions, options);
    this.registerLoggerConfiguration(appOptions);

    await this.initialize(
      moduleCls,
      container,
      graphInspector,
      applicationConfig,
      appOptions,
      httpServer,
    );

    const instance = new NestApplication(
      container,
      httpServer,
      applicationConfig,
      graphInspector,
      appOptions,
    );
    await instance.preloadLazyPackages();
    const target = this.createNestInstance(instance);
    return this.createAdapterProxy<T>(target, httpServer);
  }

  /**
   * Creates an instance of NestMicroservice.
   *
   * @param moduleCls Entry (root) application module class or module metadata
   * @param options Optional microservice configuration
   *
   * @returns A promise that, when resolved,
   * contains a reference to the NestMicroservice instance.
   */
  public async createMicroservice<T extends object>(
    moduleCls: IEntryNestModule,
    options?: NestMicroserviceOptions & T,
  ): Promise<INestMicroservice> {
    const { NestMicroservice } = await loadPackage(
      '@nestjs/microservices',
      'NestFactory',
      () => import('@nestjs/microservices'),
    );
    const applicationConfig = new ApplicationConfig();
    const container = new NestContainer(applicationConfig, options);
    const graphInspector = this.createGraphInspector(options!, container);

    this.setAbortOnError(options);
    this.registerLoggerConfiguration(options);

    await this.initialize(
      moduleCls,
      container,
      graphInspector,
      applicationConfig,
      options,
    );
    return this.createNestInstance<INestMicroservice>(
      new NestMicroservice(
        container,
        options,
        graphInspector,
        applicationConfig,
      ),
    );
  }

  /**
   * Creates an instance of NestApplicationContext.
   *
   * @param moduleCls Entry (root) application module class or module metadata
   * @param options Optional Nest application configuration
   *
   * @returns A promise that, when resolved,
   * contains a reference to the NestApplicationContext instance.
   */
  public async createApplicationContext(
    moduleCls: IEntryNestModule,
    options?: NestApplicationContextOptions,
  ): Promise<INestApplicationContext> {
    const applicationConfig = new ApplicationConfig();
    const container = new NestContainer(applicationConfig, options);
    const graphInspector = this.createGraphInspector(options!, container);

    this.setAbortOnError(options);
    this.registerLoggerConfiguration(options);

    await this.initialize(
      moduleCls,
      container,
      graphInspector,
      applicationConfig,
      options,
    );

    const modules = container.getModules().values();
    const root = modules.next().value;

    const context = this.createNestInstance<NestApplicationContext>(
      new NestApplicationContext(container, options, root),
    );
    if (this.autoFlushLogs) {
      context.flushLogsOnOverride();
    }
    return context.init();
  }

  private createNestInstance<T>(instance: T): T {
    return this.createProxy(instance);
  }

  private async initialize(
    module: IEntryNestModule,
    container: NestContainer,
    graphInspector: GraphInspector,
    config = new ApplicationConfig(),
    options: NestApplicationContextOptions = {},
    httpServer: HttpServer | null = null,
  ) {
    UuidFactory.mode = options.snapshot
      ? UuidFactoryMode.Deterministic
      : UuidFactoryMode.Random;

    const injector = new Injector({
      preview: options.preview!,
      snapshot: options.snapshot,
      instanceDecorator: options.instrument?.instanceDecorator,
    });
    const instanceLoader = new InstanceLoader(
      container,
      injector,
      graphInspector,
    );
    const metadataScanner = new MetadataScanner();
    const dependenciesScanner = new DependenciesScanner(
      container,
      metadataScanner,
      graphInspector,
      config,
    );
    container.setHttpAdapter(httpServer);

    const teardown = this.abortOnError === false ? rethrow : undefined;
    await httpServer?.init?.();
    try {
      this.logger.log(MESSAGES.APPLICATION_START);

      await ExceptionsZone.asyncRun(
        async () => {
          await dependenciesScanner.scan(await this.toRootModule(module));
          await instanceLoader.createInstancesOfDependencies();
          dependenciesScanner.applyApplicationProviders();
        },
        teardown,
        this.autoFlushLogs,
      );
    } catch (e) {
      this.handleInitializationError(e);
    }
  }

  private async toRootModule(module: IEntryNestModule): Promise<any> {
    const resolved: unknown =
      module instanceof Promise ? await (module as Promise<unknown>) : module;
    if (!this.isModuleMetadata(resolved)) {
      return resolved;
    }
    class AppModule {}
    Module(resolved)(AppModule);
    return AppModule;
  }

  private isModuleMetadata(module: unknown): module is ModuleMetadata {
    return (
      isPlainObject(module) &&
      !('module' in module) &&
      !('forwardRef' in module)
    );
  }

  private handleInitializationError(err: unknown) {
    if (this.abortOnError) {
      process.abort();
    }
    rethrow(err);
  }

  private createProxy(target: any, abortOnError?: boolean) {
    const proxy = this.createExceptionProxy(abortOnError);
    return new Proxy(target, {
      get: proxy,
      set: proxy,
    });
  }

  private createExceptionProxy(abortOnError?: boolean) {
    return (receiver: Record<string, any>, prop: string) => {
      if (!(prop in receiver)) {
        return;
      }
      if (isFunction(receiver[prop])) {
        return this.createExceptionZone(receiver, prop, abortOnError);
      }
      return receiver[prop];
    };
  }

  private createExceptionZone(
    receiver: Record<string, any>,
    prop: string,
    abortOnError?: boolean,
  ): Function {
    return (...args: unknown[]) => {
      const selectOptions =
        prop === 'select' ? (args[1] as SelectOptions | undefined) : undefined;
      const contextAbortOnError = selectOptions?.abortOnError ?? abortOnError;
      // The option the app was created with: "this.abortOnError" belongs to
      // the last app NestFactory created
      const teardown =
        (contextAbortOnError ?? receiver.appOptions?.abortOnError) === false
          ? rethrow
          : undefined;

      let result: unknown;
      ExceptionsZone.run(
        () => {
          result = receiver[prop](...args);
        },
        teardown,
        this.autoFlushLogs,
      );

      if (
        prop === 'select' &&
        contextAbortOnError !== undefined &&
        isObject(result)
      ) {
        return this.createProxy(result, contextAbortOnError);
      }
      return result;
    };
  }

  private registerLoggerConfiguration(
    options: NestApplicationContextOptions | undefined,
  ) {
    if (!options) {
      return;
    }
    const { logger, bufferLogs, autoFlushLogs, forceConsole } = options;
    if ((logger as boolean) !== true && !isNil(logger)) {
      Logger.overrideLogger(logger);
    } else if (forceConsole) {
      // If no custom logger is provided but forceConsole is true,
      // create a ConsoleLogger with forceConsole option
      const consoleLogger = new ConsoleLogger({ forceConsole: true });
      Logger.overrideLogger(consoleLogger);
    }
    if (bufferLogs) {
      Logger.attachBuffer();
    }
    this.autoFlushLogs = autoFlushLogs ?? true;
  }

  private async createHttpAdapter<T = any>(
    httpServer?: T,
  ): Promise<AbstractHttpAdapter> {
    const { ExpressAdapter } = await loadAdapter(
      '@nestjs/platform-express',
      'HTTP',
      () => import('@nestjs/platform-express'),
    );
    return new ExpressAdapter(httpServer);
  }

  private isHttpServer(
    serverOrOptions: AbstractHttpAdapter | NestApplicationOptions,
  ): serverOrOptions is AbstractHttpAdapter {
    return !!(
      serverOrOptions && (serverOrOptions as AbstractHttpAdapter).patch
    );
  }

  private setAbortOnError(
    serverOrOptions?: AbstractHttpAdapter | NestApplicationOptions,
    options?: NestApplicationContextOptions | NestApplicationOptions,
  ) {
    this.abortOnError = this.isHttpServer(serverOrOptions!)
      ? !(options && options.abortOnError === false)
      : !(serverOrOptions && serverOrOptions.abortOnError === false);
  }

  private createAdapterProxy<T>(app: NestApplication, adapter: HttpServer): T {
    const proxy = new Proxy(app, {
      get: (receiver: Record<string, any>, prop: string) => {
        const mapToProxy = (result: unknown) => {
          return result instanceof Promise
            ? result.then(mapToProxy)
            : result instanceof NestApplication
              ? proxy
              : result;
        };

        if (!(prop in receiver) && prop in adapter) {
          return (...args: unknown[]) => {
            const result = this.createExceptionZone(
              adapter,
              prop,
              // The adapter has no options of its own
              receiver.appOptions?.abortOnError,
            )(...args);
            return mapToProxy(result);
          };
        }
        if (isFunction(receiver[prop])) {
          return (...args: unknown[]) => {
            const result = receiver[prop](...args);
            return mapToProxy(result);
          };
        }
        return receiver[prop];
      },
    });
    return proxy as unknown as T;
  }

  private createGraphInspector(
    appOptions: NestApplicationContextOptions,
    container: NestContainer,
  ) {
    return appOptions?.snapshot
      ? new GraphInspector(container)
      : NoopGraphInspector;
  }
}

/**
 * Use NestFactory to create an application instance.
 *
 * ### Specifying an entry module
 *
 * Pass the required *root module* for the application via the module parameter.
 * By convention, it is usually called `ApplicationModule`.  Starting with this
 * module, Nest assembles the dependency graph and begins the process of
 * Dependency Injection and instantiates the classes needed to launch your
 * application.
 *
 * @publicApi
 */
export const NestFactory = new NestFactoryStatic();
