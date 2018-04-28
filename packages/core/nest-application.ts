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
import { MicroserviceOptions } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { ApplicationConfig } from './application-config';
import { messages } from './constants';
import { NestContainer } from './injector/container';
import { Module } from './injector/module';
import { MiddlewareModule } from './middleware/middleware-module';
import { Resolver } from './router/interfaces/resolver.interface';
import { RoutesResolver } from './router/routes-resolver';
import { MicroservicesPackageNotFoundException } from './errors/exceptions/microservices-package-not-found.exception';
import { MiddlewareContainer } from './middleware/container';
import { NestApplicationContext } from './nest-application-context';
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { HttpServer } from '@nestjs/common/interfaces';
import { ExpressAdapter } from './adapters/express-adapter';
import { FastifyAdapter } from './adapters/fastify-adapter';
import { INestExpressApplication } from '@nestjs/common/interfaces/nest-express-application.interface';
import { INestFastifyApplication } from '@nestjs/common/interfaces/nest-fastify-application.interface';
import { ServeStaticOptions } from '@nestjs/common/interfaces/external/serve-static-options.interface';
import { MissingRequiredDependencyException } from './errors/exceptions/missing-dependency.exception';

const { SocketModule } =
  optional('@nestjs/websockets/socket-module') || ({} as any);
const { MicroservicesModule } =
  optional('@nestjs/microservices/microservices-module') || ({} as any);
const { NestMicroservice } =
  optional('@nestjs/microservices/nest-microservice') || ({} as any);
const { IoAdapter } =
  optional('@nestjs/websockets/adapters/io-adapter') || ({} as any);

export class NestApplication extends NestApplicationContext
  implements INestApplication,
    INestExpressApplication,
    INestFastifyApplication {
  private readonly logger = new Logger(NestApplication.name, true);
  private readonly middlewareModule = new MiddlewareModule();
  private readonly middlewareContainer = new MiddlewareContainer();
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
    private readonly httpAdapter: HttpServer,
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
    await this.middlewareModule.register(
      this.middlewareContainer,
      this.container,
      this.config,
    );
  }

  public async init(): Promise<this> {
    const useBodyParser =
      this.appOptions && this.appOptions.bodyParser !== false;
    useBodyParser && this.registerParserMiddleware();

    await this.registerModules();
    await this.registerRouter();
    await this.callInitHook();

    this.isInitialized = true;
    this.logger.log(messages.APPLICATION_READY);
    return this;
  }

  public registerParserMiddleware() {
    if (this.httpAdapter instanceof FastifyAdapter) {
      return this.httpAdapter.register(
        this.loadPackage('fastify-formbody', 'FastifyAdapter'),
      );
    }
    if (!this.isExpress()) {
      return undefined;
    }
    const parserMiddleware = {
      jsonParser: bodyParser.json(),
      urlencodedParser: bodyParser.urlencoded({ extended: true }),
    };
    Object.keys(parserMiddleware)
      .filter(parser => !this.isMiddlewareApplied(this.httpAdapter, parser))
      .forEach(parserKey => this.httpAdapter.use(parserMiddleware[parserKey]));
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
    await this.registerMiddleware(this.httpAdapter);
    const prefix = this.config.getGlobalPrefix();
    const basePath = prefix ? validatePath(prefix) : '';
    this.routesResolver.resolve(this.httpAdapter, basePath);
  }

  public connectMicroservice(options: MicroserviceOptions): INestMicroservice {
    if (!NestMicroservice) {
      throw new MicroservicesPackageNotFoundException();
    }
    const applicationConfig = new ApplicationConfig();
    const instance = new NestMicroservice(
      this.container as any,
      options as any,
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

  public register(...args): this {
    const adapter = this.httpAdapter as FastifyAdapter;
    adapter.register && adapter.register(...args);
    return this;
  }

  public inject(...args) {
    const adapter = this.httpAdapter as FastifyAdapter;
    return adapter.inject && adapter.inject(...args);
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

  public async close(): Promise<any> {
    this.socketModule && (await this.socketModule.close());
    this.httpServer && this.httpServer.close();

    await Promise.all(
      iterate(this.microservices).map(async microservice => {
        microservice.setIsTerminated(true);
        await microservice.close();
      }),
    );
    await this.callDestroyHook();
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

  public useStaticAssets(options: any): this;
  public useStaticAssets(path: string, options?: ServeStaticOptions);
  public useStaticAssets(
    pathOrOptions: any,
    options?: ServeStaticOptions,
  ): this {
    this.httpAdapter.useStaticAssets &&
      this.httpAdapter.useStaticAssets(pathOrOptions, options);
    return this;
  }

  public setBaseViewsDir(path: string): this {
    this.httpAdapter.setBaseViewsDir && this.httpAdapter.setBaseViewsDir(path);
    return this;
  }

  public setViewEngine(engineOrOptions: any): this {
    this.httpAdapter.setViewEngine &&
      this.httpAdapter.setViewEngine(engineOrOptions);
    return this;
  }

  private loadPackage(name: string, ctx: string) {
    try {
      return require(name);
    } catch (e) {
      throw new MissingRequiredDependencyException(name, ctx);
    }
  }

  private async registerMiddleware(instance) {
    await this.middlewareModule.registerMiddleware(
      this.middlewareContainer,
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

  private async callDestroyHook(): Promise<any> {
    const modules = this.container.getModules();
    await Promise.all(
      iterate(modules.values()).map(
        async module => await this.callModuleDestroyHook(module),
      ),
    );
  }

  private async callModuleDestroyHook(module: Module): Promise<any> {
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

  private hasOnModuleDestroyHook(instance): instance is OnModuleDestroy {
    return !isUndefined((instance as OnModuleDestroy).onModuleDestroy);
  }
}
