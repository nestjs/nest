import {
  CanActivate,
  ExceptionFilter,
  INestMicroservice,
  NestInterceptor,
  PipeTransform,
  WebSocketAdapter,
} from '@nestjs/common';
import { Logger } from '@nestjs/common/services/logger.service';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { MESSAGES } from '@nestjs/core/constants';
import { optionalRequire } from '@nestjs/core/helpers/optional-require';
import { NestContainer } from '@nestjs/core/injector/container';
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

export class NestMicroservice extends NestApplicationContext
  implements INestMicroservice {
  private readonly logger = new Logger(NestMicroservice.name, true);
  private readonly microservicesModule = new MicroservicesModule();
  private readonly socketModule = SocketModule ? new SocketModule() : null;
  private microserviceConfig: MicroserviceOptions;
  private server: Server & CustomTransportStrategy;
  private isTerminated = false;
  private isInitHookCalled = false;

  constructor(
    container: NestContainer,
    config: MicroserviceOptions = {},
    private readonly applicationConfig: ApplicationConfig,
  ) {
    super(container);

    this.microservicesModule.register(container, this.applicationConfig);
    this.createServer(config);
    this.selectContextModule();
  }

  public createServer(config: MicroserviceOptions) {
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
      this.socketModule.register(this.container, this.applicationConfig);
    this.microservicesModule.setupClients(this.container);

    this.registerListeners();
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
    return this;
  }

  public useGlobalPipes(...pipes: PipeTransform<any>[]): this {
    this.applicationConfig.useGlobalPipes(...pipes);
    return this;
  }

  public useGlobalInterceptors(...interceptors: NestInterceptor[]): this {
    this.applicationConfig.useGlobalInterceptors(...interceptors);
    return this;
  }

  public useGlobalGuards(...guards: CanActivate[]): this {
    this.applicationConfig.useGlobalGuards(...guards);
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

  public listen(callback: () => void) {
    this.listenAsync().then(callback);
  }

  public async listenAsync(): Promise<any> {
    !this.isInitialized && (await this.registerModules());

    this.logger.log(MESSAGES.MICROSERVICE_READY);
    return new Promise(resolve => this.server.listen(resolve));
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
    await super.close();
    this.setIsTerminated(true);
  }

  protected async dispose(): Promise<void> {
    await this.server.close();
    if (this.isTerminated) {
      return;
    }
    this.socketModule && (await this.socketModule.close());
  }
}
