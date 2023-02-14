import {
  HttpServer,
  INestApplication,
  INestApplicationContext,
  INestMicroservice,
} from '@nestjs/common';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isFunction, isNil } from '@nestjs/common/utils/shared.utils';
import { AbstractHttpAdapter } from './adapters/http-adapter';
import { ApplicationConfig } from './application-config';
import { MESSAGES } from './constants';
import { ExceptionsZone } from './errors/exceptions-zone';
import { loadAdapter } from './helpers/load-adapter';
import { rethrow } from './helpers/rethrow';
import { NestContainer } from './injector/container';
import { Injector } from './injector/injector';
import { InstanceLoader } from './injector/instance-loader';
import { GraphInspector } from './inspector/graph-inspector';
import { NoopGraphInspector } from './inspector/noop-graph-inspector';
import { UuidFactory, UuidFactoryMode } from './inspector/uuid-factory';
import { MetadataScanner } from './metadata-scanner';
import { NestApplication } from './nest-application';
import { NestApplicationContext } from './nest-application-context';
import { DependenciesScanner } from './scanner';

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
   * Creates an instance of NestApplication.
   *
   * @param module Entry (root) application module class
   * @param options List of options to initialize NestApplication
   *
   * @returns A promise that, when resolved,
   * contains a reference to the NestApplication instance.
   */
  public async create<T extends INestApplication = INestApplication>(
    module: any,
    options?: NestApplicationOptions,
  ): Promise<T>;
  /**
   * Creates an instance of NestApplication with the specified `httpAdapter`.
   *
   * @param module Entry (root) application module class
   * @param httpAdapter Adapter to proxy the request/response cycle to
   *    the underlying HTTP server
   * @param options List of options to initialize NestApplication
   *
   * @returns A promise that, when resolved,
   * contains a reference to the NestApplication instance.
   */
  public async create<T extends INestApplication = INestApplication>(
    module: any,
    httpAdapter: AbstractHttpAdapter,
    options?: NestApplicationOptions,
  ): Promise<T>;
  public async create<T extends INestApplication = INestApplication>(
    moduleCls: any,
    serverOrOptions?: AbstractHttpAdapter | NestApplicationOptions,
    options?: NestApplicationOptions,
  ): Promise<T> {
    const [httpServer, appOptions] = this.isHttpServer(serverOrOptions)
      ? [serverOrOptions, options]
      : [this.createHttpAdapter(), serverOrOptions];

    const applicationConfig = new ApplicationConfig();
    const container = new NestContainer(applicationConfig);
    const graphInspector = this.createGraphInspector(appOptions, container);

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
    const target = this.createNestInstance(instance);
    return this.createAdapterProxy<T>(target, httpServer);
  }

  /**
   * Creates an instance of NestMicroservice.
   *
   * @param moduleCls Entry (root) application module class
   * @param options Optional microservice configuration
   *
   * @returns A promise that, when resolved,
   * contains a reference to the NestMicroservice instance.
   */
  public async createMicroservice<T extends object>(
    moduleCls: any,
    options?: NestMicroserviceOptions & T,
  ): Promise<INestMicroservice> {
    const { NestMicroservice } = loadPackage(
      '@nestjs/microservices',
      'NestFactory',
      () => require('@nestjs/microservices'),
    );
    const applicationConfig = new ApplicationConfig();
    const container = new NestContainer(applicationConfig);
    const graphInspector = this.createGraphInspector(options, container);

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
   * @param moduleCls Entry (root) application module class
   * @param options Optional Nest application configuration
   *
   * @returns A promise that, when resolved,
   * contains a reference to the NestApplicationContext instance.
   */
  public async createApplicationContext(
    moduleCls: any,
    options?: NestApplicationContextOptions,
  ): Promise<INestApplicationContext> {
    const container = new NestContainer();
    const graphInspector = this.createGraphInspector(options, container);

    this.setAbortOnError(options);
    this.registerLoggerConfiguration(options);

    const applicationConfig = undefined;
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
    module: any,
    container: NestContainer,
    graphInspector: GraphInspector,
    config = new ApplicationConfig(),
    options: NestApplicationContextOptions = {},
    httpServer: HttpServer = null,
  ) {
    UuidFactory.mode = options.snapshot
      ? UuidFactoryMode.Deterministic
      : UuidFactoryMode.Random;

    const injector = new Injector({ preview: options.preview });
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
    await httpServer?.init();
    try {
      this.logger.log(MESSAGES.APPLICATION_START);

      await ExceptionsZone.asyncRun(
        async () => {
          await dependenciesScanner.scan(module);
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

  private handleInitializationError(err: unknown) {
    if (this.abortOnError) {
      process.abort();
    }
    rethrow(err);
  }

  private createProxy(target: any) {
    const proxy = this.createExceptionProxy();
    return new Proxy(target, {
      get: proxy,
      set: proxy,
    });
  }

  private createExceptionProxy() {
    return (receiver: Record<string, any>, prop: string) => {
      if (!(prop in receiver)) {
        return;
      }
      if (isFunction(receiver[prop])) {
        return this.createExceptionZone(receiver, prop);
      }
      return receiver[prop];
    };
  }

  private createExceptionZone(
    receiver: Record<string, any>,
    prop: string,
  ): Function {
    const teardown = this.abortOnError === false ? rethrow : undefined;

    return (...args: unknown[]) => {
      let result: unknown;
      ExceptionsZone.run(() => {
        result = receiver[prop](...args);
      }, teardown);

      return result;
    };
  }

  private registerLoggerConfiguration(
    options: NestApplicationContextOptions | undefined,
  ) {
    if (!options) {
      return;
    }
    const { logger, bufferLogs, autoFlushLogs } = options;
    if ((logger as boolean) !== true && !isNil(logger)) {
      Logger.overrideLogger(logger);
    }
    if (bufferLogs) {
      Logger.attachBuffer();
    }
    this.autoFlushLogs = autoFlushLogs ?? true;
  }

  private createHttpAdapter<T = any>(httpServer?: T): AbstractHttpAdapter {
    const { ExpressAdapter } = loadAdapter(
      '@nestjs/platform-express',
      'HTTP',
      () => require('@nestjs/platform-express'),
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
    this.abortOnError = this.isHttpServer(serverOrOptions)
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
            const result = this.createExceptionZone(adapter, prop)(...args);
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
