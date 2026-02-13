import {
  CanActivate,
  ExceptionFilter,
  INestMicroservice,
  NestInterceptor,
  PipeTransform,
  WebSocketAdapter,
} from '@nestjs/common';
import { Transport } from './enums/transport.enum.js';
import {
  AsyncMicroserviceOptions,
  MicroserviceOptions,
} from './interfaces/microservice-configuration.interface.js';
import { MicroservicesModule } from './microservices-module.js';
import { ServerFactory } from './server/server-factory.js';
import { Server } from './server/server.js';
import { NestMicroserviceOptions } from '@nestjs/common/internal';
import { Logger } from '@nestjs/common';
import {
  ApplicationConfig,
  NestContainer,
  GraphInspector,
  NestApplicationContext,
} from '@nestjs/core';
import { MESSAGES, optionalRequire, Injector } from '@nestjs/core/internal';

type CompleteMicroserviceOptions = NestMicroserviceOptions &
  (MicroserviceOptions | AsyncMicroserviceOptions);

export class NestMicroservice
  extends NestApplicationContext<NestMicroserviceOptions>
  implements INestMicroservice
{
  protected readonly logger = new Logger(NestMicroservice.name, {
    timestamp: true,
  });
  private readonly microservicesModule = new MicroservicesModule();
  private socketModule: any = null;
  private microserviceConfig: Exclude<
    CompleteMicroserviceOptions,
    AsyncMicroserviceOptions
  >;
  private serverInstance: Server;
  private isTerminated = false;
  private wasInitHookCalled = false;

  /**
   * Returns an observable that emits status changes.
   */
  get status() {
    return this.serverInstance.status;
  }

  constructor(
    container: NestContainer,
    config: CompleteMicroserviceOptions = {},
    private readonly graphInspector: GraphInspector,
    private readonly applicationConfig: ApplicationConfig,
  ) {
    super(container, config);

    this.injector = new Injector({
      preview: config.preview!,
      instanceDecorator: config.instrument?.instanceDecorator,
    });
    this.microservicesModule.register(
      container,
      this.graphInspector,
      this.applicationConfig,
      this.appOptions,
    );
    this.createServer(config);
    this.selectContextModule();

    const modulesContainer = this.container.getModules();
    modulesContainer.addRpcTarget(this.serverInstance);
  }

  public createServer(config: CompleteMicroserviceOptions) {
    try {
      if ('useFactory' in config) {
        const resolvedConfig = this.resolveAsyncOptions(config);
        this.microserviceConfig = resolvedConfig;

        // Inject custom strategy
        if ('strategy' in resolvedConfig) {
          this.serverInstance = resolvedConfig.strategy as Server;
          return;
        }
      } else {
        this.microserviceConfig = {
          transport: Transport.TCP,
          ...config,
        } as MicroserviceOptions;

        if ('strategy' in config) {
          this.serverInstance = config.strategy as Server;
          return;
        }
      }

      this.serverInstance = ServerFactory.create(
        this.microserviceConfig,
      ) as Server;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async registerModules(): Promise<any> {
    this.socketModule &&
      this.socketModule.register(
        this.container,
        this.applicationConfig,
        this.graphInspector,
        this.appOptions,
      );

    if (!this.appOptions.preview) {
      this.microservicesModule.setupClients(this.container);
      this.registerListeners();
    }

    this.setIsInitialized(true);

    if (!this.wasInitHookCalled) {
      await this.callInitHook();
      await this.callBootstrapHook();
    }
  }

  public registerListeners() {
    this.microservicesModule.setupListeners(
      this.container,
      this.serverInstance,
    );
  }

  /**
   * Registers a web socket adapter that will be used for Gateways.
   * Use to override the default `socket.io` library.
   *
   * @param {WebSocketAdapter} adapter
   * @returns {this}
   */
  public useWebSocketAdapter(adapter: WebSocketAdapter): this {
    if (this.isInitialized) {
      this.logger.warn(
        'Cannot apply WebSocket adapter: registration must occur before initialization.',
      );
    }
    this.applicationConfig.setIoAdapter(adapter);
    return this;
  }

  /**
   * Registers global exception filters (will be used for every pattern handler).
   *
   * @param {...ExceptionFilter} filters
   */
  public useGlobalFilters(...filters: ExceptionFilter[]): this {
    if (this.isInitialized) {
      this.logger.warn(
        'Cannot apply global exception filters: registration must occur before initialization.',
      );
    }

    filters = this.applyInstanceDecoratorIfRegistered<ExceptionFilter>(
      ...filters,
    );
    this.applicationConfig.useGlobalFilters(...filters);
    filters.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'filter',
        ref: item,
      }),
    );
    return this;
  }

  /**
   * Registers global pipes (will be used for every pattern handler).
   *
   * @param {...PipeTransform} pipes
   */
  public useGlobalPipes(...pipes: PipeTransform<any>[]): this {
    if (this.isInitialized) {
      this.logger.warn(
        'Global pipes registered after initialization will not be applied.',
      );
    }

    pipes = this.applyInstanceDecoratorIfRegistered<PipeTransform<any>>(
      ...pipes,
    );
    this.applicationConfig.useGlobalPipes(...pipes);
    pipes.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'pipe',
        ref: item,
      }),
    );
    return this;
  }

  /**
   * Registers global interceptors (will be used for every pattern handler).
   *
   * @param {...NestInterceptor} interceptors
   */
  public useGlobalInterceptors(...interceptors: NestInterceptor[]): this {
    if (this.isInitialized) {
      this.logger.warn(
        'Cannot apply global interceptors: registration must occur before initialization.',
      );
    }

    interceptors = this.applyInstanceDecoratorIfRegistered<NestInterceptor>(
      ...interceptors,
    );
    this.applicationConfig.useGlobalInterceptors(...interceptors);
    interceptors.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'interceptor',
        ref: item,
      }),
    );
    return this;
  }

  public useGlobalGuards(...guards: CanActivate[]): this {
    if (this.isInitialized) {
      this.logger.warn(
        'Cannot apply global guards: registration must occur before initialization.',
      );
    }

    guards = this.applyInstanceDecoratorIfRegistered<CanActivate>(...guards);
    this.applicationConfig.useGlobalGuards(...guards);
    guards.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'guard',
        ref: item,
      }),
    );
    return this;
  }

  public async init(): Promise<this> {
    if (this.isInitialized) {
      return this;
    }

    // Lazy-load optional socket module (ESM-compatible)
    await this.loadSocketModule();
    await super.init();
    await this.registerModules();
    return this;
  }

  /**
   * Starts the microservice.
   *
   * @returns {void}
   */
  public async listen(): Promise<any> {
    this.assertNotInPreviewMode('listen');
    !this.isInitialized && (await this.registerModules());

    return new Promise<any>((resolve, reject) => {
      this.serverInstance.listen((err, info) => {
        if (this.microserviceConfig?.autoFlushLogs ?? true) {
          this.flushLogs();
        }
        if (err) {
          return reject(err as Error);
        }
        this.logger.log(MESSAGES.MICROSERVICE_READY);
        resolve(info);
      });
    });
  }

  /**
   * Terminates the application.
   *
   * @returns {Promise<void>}
   */
  public async close(): Promise<any> {
    await this.serverInstance.close();
    if (this.isTerminated) {
      return;
    }
    this.setIsTerminated(true);
    await this.closeApplication();
  }

  /**
   * Sets the flag indicating that the application is initialized.
   * @param isInitialized Value to set
   */
  public setIsInitialized(isInitialized: boolean) {
    this.isInitialized = isInitialized;
  }

  /**
   * Sets the flag indicating that the application is terminated.
   * @param isTerminated Value to set
   */
  public setIsTerminated(isTerminated: boolean) {
    this.isTerminated = isTerminated;
  }

  /**
   * Sets the flag indicating that the init hook was called.
   * @param isInitHookCalled Value to set
   */
  public setIsInitHookCalled(isInitHookCalled: boolean) {
    this.wasInitHookCalled = isInitHookCalled;
  }

  /**
   * Registers an event listener for the given event.
   * @param event Event name
   * @param callback Callback to be executed when the event is emitted
   */
  public on(event: string | number | symbol, callback: Function) {
    if ('on' in this.serverInstance) {
      return this.serverInstance.on(event as string, callback);
    }
    throw new Error('"on" method not supported by the underlying server');
  }

  /**
   * Returns an instance of the underlying server/broker instance,
   * or a group of servers if there are more than one.
   */
  public unwrap<T>(): T {
    if ('unwrap' in this.serverInstance) {
      return this.serverInstance.unwrap();
    }
    throw new Error('"unwrap" method not supported by the underlying server');
  }

  protected async closeApplication(): Promise<any> {
    this.socketModule && (await this.socketModule.close());
    this.microservicesModule && (await this.microservicesModule.close());

    await super.close();
    this.setIsTerminated(true);
  }

  protected async dispose(): Promise<void> {
    if (this.isTerminated) {
      return;
    }
    await this.serverInstance.close();
    this.socketModule && (await this.socketModule.close());
    this.microservicesModule && (await this.microservicesModule.close());
  }

  protected resolveAsyncOptions(config: AsyncMicroserviceOptions) {
    const args = config.inject?.map(token =>
      this.get(token, { strict: false }),
    );
    return config.useFactory(...args);
  }

  private applyInstanceDecoratorIfRegistered<T>(...instances: T[]): T[] {
    if (this.appOptions.instrument?.instanceDecorator) {
      return instances.map(
        instance =>
          this.appOptions.instrument!.instanceDecorator(instance) as T,
      );
    }
    return instances;
  }

  private async loadSocketModule() {
    if (!this.socketModule) {
      const socketModule = await optionalRequire(
        '@nestjs/websockets/socket-module',
        () => import('@nestjs/websockets/socket-module.js'),
      );
      if (socketModule?.SocketModule) {
        this.socketModule = new socketModule.SocketModule();
      }
    }
  }
}
