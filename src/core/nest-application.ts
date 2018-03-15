import * as cors from 'cors';
import * as http from 'http';
import * as https from 'https';
import * as optional from 'optional';
import * as bodyParser from 'body-parser';
import iterate from 'iterare';
import {
  CanActivate,
  ExceptionFilter,
  NestInterceptor,
  OnModuleDestroy,
  PipeTransform,
  WebSocketAdapter,
} from '@nestjs/common';
import {
  INestApplication,
  INestMicroservice,
  OnModuleInit,
} from '@nestjs/common';
import { Logger } from '@nestjs/common/services/logger.service';
import {
  isNil,
  isUndefined,
  validatePath,
  isFunction,
  isObject,
} from '@nestjs/common/utils/shared.utils';
import { MicroserviceConfiguration } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { ApplicationConfig } from './application-config';
import { messages } from './constants';
import { NestContainer } from './injector/container';
import { Module } from './injector/module';
import { MiddlewaresModule } from './middlewares/middlewares-module';
import { Resolver } from './router/interfaces/resolver.interface';
import { RoutesResolver } from './router/routes-resolver';
import { MicroservicesPackageNotFoundException } from './errors/exceptions/microservices-package-not-found.exception';
import { MiddlewaresContainer } from './middlewares/container';
import { NestApplicationContext } from './nest-application-context';
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { HttpServer } from '@nestjs/common/interfaces';
import { ExpressAdapter } from './adapters/express-adapter';
import { FastifyAdapter } from './adapters/fastify-adapter';
import * as formbody from 'fastify-formbody';

const { SocketModule } =
  optional('@nestjs/websockets/socket-module') || ({} as any);
const { MicroservicesModule } =
  optional('@nestjs/microservices/microservices-module') || ({} as any);
const { NestMicroservice } =
  optional('@nestjs/microservices/nest-microservice') || ({} as any);
const { IoAdapter } =
  optional('@nestjs/websockets/adapters/io-adapter') || ({} as any);

export class NestApplication extends NestApplicationContext
  implements INestApplication {
  private readonly logger = new Logger(NestApplication.name, true);
  private readonly middlewaresModule = new MiddlewaresModule();
  private readonly middlewaresContainer = new MiddlewaresContainer();
  private readonly microservicesModule = MicroservicesModule
    ? new MicroservicesModule()
    : null;
  private readonly socketModule = SocketModule ? new SocketModule() : null;
  private readonly routesResolver: Resolver;
  private readonly microservices = [];
  private httpServer: http.Server;
  private isInitialized = false;

  constructor(
    container: NestContainer,
    private httpAdapter: HttpServer,
    private readonly config: ApplicationConfig,
    private readonly appOptions: NestApplicationOptions = {},
  ) {
    super(container, [], null);

    this.applyOptions();
    this.selectContextModule();
    this.registerHttpServer();

    this.routesResolver = new RoutesResolver(this.container, this.config);
  }

  public registerHttpServer() {
    this.httpServer = this.createServer();

    const server = this.getUnderlyingHttpServer();
    const ioAdapter = IoAdapter ? new IoAdapter(server) : null;
    this.config.setIoAdapter(ioAdapter);
  }

  public applyOptions() {
    if (!this.appOptions || !this.appOptions.cors) {
      return undefined;
    }
    const isCorsOptionsObj = isObject(this.appOptions.cors);
    if (!isCorsOptionsObj) {
      return this.enableCors();
    }
    this.enableCors(this.appOptions.cors as CorsOptions);
  }

  public createServer(): any {
    const isHttpsEnabled = this.appOptions && this.appOptions.httpsOptions;
    const isExpress = this.isExpress();

    if (isHttpsEnabled && isExpress) {
      return https.createServer(
        this.appOptions.httpsOptions,
        this.httpAdapter.getHttpServer(),
      );
    }
    if (isExpress) {
      return http.createServer(this.httpAdapter.getHttpServer());
    }
    return this.httpAdapter;
  }

  public getUnderlyingHttpServer(): any {
    return this.isExpress()
      ? this.httpServer
      : this.httpAdapter.getHttpServer();
  }

  public async registerModules() {
    this.socketModule &&
      this.socketModule.register(this.container, this.config);

    if (this.microservicesModule) {
      this.microservicesModule.register(this.container, this.config);
      this.microservicesModule.setupClients(this.container);
    }
    await this.middlewaresModule.register(
      this.middlewaresContainer,
      this.container,
      this.config,
    );
  }

  public async init(): Promise<this> {
    const useBodyParser =
      this.appOptions && this.appOptions.bodyParser !== false;
    useBodyParser && this.registerParserMiddlewares();

    await this.registerModules();
    await this.registerRouter();

    this.callInitHook();
    this.logger.log(messages.APPLICATION_READY);
    this.isInitialized = true;
    return this;
  }

  public registerParserMiddlewares() {
    if (this.httpAdapter instanceof FastifyAdapter) {
      return this.httpAdapter.register(formbody);
    }
    if (!this.isExpress()) {
      return void 0;
    }
    const parserMiddlewares = {
      jsonParser: bodyParser.json(),
      urlencodedParser: bodyParser.urlencoded({ extended: true }),
    };
    Object.keys(parserMiddlewares)
      .filter(parser => !this.isMiddlewareApplied(this.httpAdapter, parser))
      .forEach(parserKey => this.httpAdapter.use(parserMiddlewares[parserKey]));
  }

  public isMiddlewareApplied(httpAdapter: HttpServer, name: string): boolean {
    const app = this.httpAdapter.getHttpServer();
    return (
      !!app._router &&
      !!app._router.stack &&
      isFunction(app._router.stack.filter) &&
      !!app._router.stack.filter(
        layer => layer && layer.handle && layer.handle.name === name,
      ).length
    );
  }

  public async registerRouter() {
    await this.registerMiddlewares(this.httpAdapter);
    const prefix = this.config.getGlobalPrefix();
    const basePath = prefix ? validatePath(prefix) : '';
    this.routesResolver.resolve(this.httpAdapter, basePath);
  }

  public connectMicroservice(
    config: MicroserviceConfiguration,
  ): INestMicroservice {
    if (!NestMicroservice) {
      throw new MicroservicesPackageNotFoundException();
    }
    const applicationConfig = new ApplicationConfig();
    const instance = new NestMicroservice(
      this.container as any,
      config as any,
      applicationConfig,
    );
    instance.registerListeners();
    instance.setIsInitialized(true);
    instance.setIsInitHookCalled(true);

    this.microservices.push(instance);
    return instance;
  }

  public getMicroservices(): INestMicroservice[] {
    return this.microservices;
  }

  public getHttpServer() {
    return this.httpServer;
  }

  public startAllMicroservices(callback?: () => void): this {
    Promise.all(this.microservices.map(this.listenToPromise)).then(
      () => callback && callback(),
    );
    return this;
  }

  public startAllMicroservicesAsync(): Promise<void> {
    return new Promise(resolve => this.startAllMicroservices(resolve));
  }

  public use(...args: any[]): this {
    (this.httpAdapter as any).use(...args);
    return this;
  }

  public engine(...args): this {
    if (!this.isExpress()) {
      return this;
    }
    (this.httpAdapter as ExpressAdapter).engine(...args);
    return this;
  }

  public set(...args): this {
    if (!this.isExpress()) {
      return this;
    }
    (this.httpAdapter as ExpressAdapter).set(...args);
    return this;
  }

  public disable(...args): this {
    if (!this.isExpress()) {
      return this;
    }
    (this.httpAdapter as ExpressAdapter).disable(...args);
    return this;
  }

  public enable(...args): this {
    if (!this.isExpress()) {
      return this;
    }
    (this.httpAdapter as ExpressAdapter).enable(...args);
    return this;
  }

  public enableCors(options?: CorsOptions): this {
    this.httpAdapter.use(cors(options));
    return this;
  }

  public async listen(port: number | string, callback?: () => void);
  public async listen(
    port: number | string,
    hostname: string,
    callback?: () => void,
  );
  public async listen(port: number | string, ...args) {
    !this.isInitialized && (await this.init());

    this.httpServer.listen(port, ...args);
    return this.httpServer;
  }

  public listenAsync(port: number | string, hostname?: string): Promise<any> {
    return new Promise(resolve => {
      const server = this.listen(port, hostname, () => resolve(server));
    });
  }

  public close() {
    this.socketModule && this.socketModule.close();
    this.httpServer && this.httpServer.close();
    this.microservices.forEach(microservice => {
      microservice.setIsTerminated(true);
      microservice.close();
    });
    this.callDestroyHook();
  }

  public setGlobalPrefix(prefix: string): this {
    this.config.setGlobalPrefix(prefix);
    return this;
  }

  public useWebSocketAdapter(adapter: WebSocketAdapter): this {
    this.config.setIoAdapter(adapter);
    return this;
  }

  public useGlobalFilters(...filters: ExceptionFilter[]): this {
    this.config.useGlobalFilters(...filters);
    return this;
  }

  public useGlobalPipes(...pipes: PipeTransform<any>[]): this {
    this.config.useGlobalPipes(...pipes);
    return this;
  }

  public useGlobalInterceptors(...interceptors: NestInterceptor[]): this {
    this.config.useGlobalInterceptors(...interceptors);
    return this;
  }

  public useGlobalGuards(...guards: CanActivate[]): this {
    this.config.useGlobalGuards(...guards);
    return this;
  }

  private async registerMiddlewares(instance) {
    await this.middlewaresModule.registerMiddlewares(
      this.middlewaresContainer,
      instance,
    );
  }

  private isExpress(): boolean {
    const isExpress = !this.httpAdapter.getHttpServer;
    if (isExpress) {
      return isExpress;
    }
    return this.httpAdapter instanceof ExpressAdapter;
  }

  private listenToPromise(microservice: INestMicroservice) {
    return new Promise(async (resolve, reject) => {
      await microservice.listen(resolve);
    });
  }

  private callInitHook() {
    const modules = this.container.getModules();
    modules.forEach(module => {
      this.callModuleInitHook(module);
    });
  }

  private callModuleInitHook(module: Module) {
    const components = [...module.routes, ...module.components];
    iterate(components)
      .map(([key, { instance }]) => instance)
      .filter(instance => !isNil(instance))
      .filter(this.hasOnModuleInitHook)
      .forEach(instance => (instance as OnModuleInit).onModuleInit());
  }

  private hasOnModuleInitHook(instance): instance is OnModuleInit {
    return !isUndefined((instance as OnModuleInit).onModuleInit);
  }

  private callDestroyHook() {
    const modules = this.container.getModules();
    modules.forEach(module => {
      this.callModuleDestroyHook(module);
    });
  }

  private callModuleDestroyHook(module: Module) {
    const components = [...module.routes, ...module.components];
    iterate(components)
      .map(([key, { instance }]) => instance)
      .filter(instance => !isNil(instance))
      .filter(this.hasOnModuleDestroyHook)
      .forEach(instance => (instance as OnModuleDestroy).onModuleDestroy());
  }

  private hasOnModuleDestroyHook(instance): instance is OnModuleDestroy {
    return !isUndefined((instance as OnModuleDestroy).onModuleDestroy);
  }
}
