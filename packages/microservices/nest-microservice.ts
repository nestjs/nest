import {
  CanActivate,
  ExceptionFilter,
  INestMicroservice,
  NestInterceptor,
  PipeTransform,
  WebSocketAdapter,
} from '@nestjs/common';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { MESSAGES } from '@nestjs/core/constants';
import { optionalRequire } from '@nestjs/core/helpers/optional-require';
import { NestContainer } from '@nestjs/core/injector/container';
import { Injector } from '@nestjs/core/injector/injector';
import { GraphInspector } from '@nestjs/core/inspector/graph-inspector';
import { NestApplicationContext } from '@nestjs/core/nest-application-context';
import { Transport } from './enums/transport.enum';
import { CustomTransportStrategy } from './interfaces/custom-transport-strategy.interface';
import { MicroserviceOptions } from './interfaces/microservice-configuration.interface';
import { MicroservicesModule } from './microservices-module';
import { Server } from './server/server';
import { ServerFactory } from './server/server-factory';

const { SocketModule } = optionalRequire(
  '@nestjs/websockets/socket-module',
  () => require('@nestjs/websockets/socket-module'),
);

export class NestMicroservice
  extends NestApplicationContext<NestMicroserviceOptions>
  implements INestMicroservice
{
  protected readonly logger = new Logger(NestMicroservice.name, {
    timestamp: true,
  });
  private readonly microservicesModule = new MicroservicesModule();
  private readonly socketModule = SocketModule ? new SocketModule() : null;
  private microserviceConfig: NestMicroserviceOptions & MicroserviceOptions;
  private server: Server & CustomTransportStrategy;
  private isTerminated = false;
  private isInitHookCalled = false;

  constructor(
    container: NestContainer,
    config: NestMicroserviceOptions & MicroserviceOptions = {},
    private readonly graphInspector: GraphInspector,
    private readonly applicationConfig: ApplicationConfig,
  ) {
    super(container, config);

    this.injector = new Injector({ preview: config.preview });
    this.microservicesModule.register(
      container,
      this.graphInspector,
      this.applicationConfig,
      this.appOptions,
    );
    this.createServer(config);
    this.selectContextModule();
  }

  public createServer(config: NestMicroserviceOptions & MicroserviceOptions) {
    try {
      this.microserviceConfig = {
        transport: Transport.TCP,
        ...config,
      } as any;
      const { strategy } = config as any;
      this.server = strategy
        ? strategy
        : ServerFactory.create(this.microserviceConfig);
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

    if (!this.isInitHookCalled) {
      await this.callInitHook();
      await this.callBootstrapHook();
    }
  }

  public registerListeners() {
    this.microservicesModule.setupListeners(this.container, this.server);
  }

  public useWebSocketAdapter(adapter: WebSocketAdapter): this {
    this.applicationConfig.setIoAdapter(adapter);
    return this;
  }

  public useGlobalFilters(...filters: ExceptionFilter[]): this {
    this.applicationConfig.useGlobalFilters(...filters);
    filters.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'filter',
        ref: item,
      }),
    );
    return this;
  }

  public useGlobalPipes(...pipes: PipeTransform<any>[]): this {
    this.applicationConfig.useGlobalPipes(...pipes);
    pipes.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'pipe',
        ref: item,
      }),
    );
    return this;
  }

  public useGlobalInterceptors(...interceptors: NestInterceptor[]): this {
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
    await super.init();
    await this.registerModules();
    return this;
  }

  public async listen() {
    this.assertNotInPreviewMode('listen');
    !this.isInitialized && (await this.registerModules());

    return new Promise<any>((resolve, reject) => {
      this.server.listen((err, info) => {
        if (this.microserviceConfig?.autoFlushLogs ?? true) {
          this.flushLogs();
        }
        if (err) {
          return reject(err);
        }
        this.logger.log(MESSAGES.MICROSERVICE_READY);
        resolve(info);
      });
    });
  }

  public async close(): Promise<any> {
    await this.server.close();
    if (this.isTerminated) {
      return;
    }
    this.setIsTerminated(true);
    await this.closeApplication();
  }

  public setIsInitialized(isInitialized: boolean) {
    this.isInitialized = isInitialized;
  }

  public setIsTerminated(isTerminated: boolean) {
    this.isTerminated = isTerminated;
  }

  public setIsInitHookCalled(isInitHookCalled: boolean) {
    this.isInitHookCalled = isInitHookCalled;
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
    await this.server.close();
    this.socketModule && (await this.socketModule.close());
    this.microservicesModule && (await this.microservicesModule.close());
  }
}
