import {
  CanActivate,
  ExceptionFilter,
  HttpServer,
  INestApplication,
  INestMicroservice,
  NestHybridApplicationOptions,
  NestInterceptor,
  PipeTransform,
  RequestMethod,
  VersioningOptions,
  VersioningType,
  WebSocketAdapter,
} from '@nestjs/common';
import { RouteInfo } from '@nestjs/common/interfaces';
import {
  CorsOptions,
  CorsOptionsDelegate,
} from '@nestjs/common/interfaces/external/cors-options.interface';
import { GlobalPrefixOptions } from '@nestjs/common/interfaces/global-prefix-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import {
  addLeadingSlash,
  isFunction,
  isObject,
  isString,
} from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import { platform } from 'os';
import * as pathToRegexp from 'path-to-regexp';
import { AbstractHttpAdapter } from './adapters';
import { ApplicationConfig } from './application-config';
import { MESSAGES } from './constants';
import { optionalRequire } from './helpers/optional-require';
import { NestContainer } from './injector/container';
import { MiddlewareContainer } from './middleware/container';
import { MiddlewareModule } from './middleware/middleware-module';
import { NestApplicationContext } from './nest-application-context';
import { ExcludeRouteMetadata } from './router/interfaces/exclude-route-metadata.interface';
import { Resolver } from './router/interfaces/resolver.interface';
import { RoutesResolver } from './router/routes-resolver';

const { SocketModule } = optionalRequire(
  '@nestjs/websockets/socket-module',
  () => require('@nestjs/websockets/socket-module'),
);
const {
  MicroservicesModule,
} = optionalRequire('@nestjs/microservices/microservices-module', () =>
  require('@nestjs/microservices/microservices-module'),
);

/**
 * @publicApi
 */
export class NestApplication
  extends NestApplicationContext
  implements INestApplication {
  private readonly logger = new Logger(NestApplication.name, {
    timestamp: true,
  });
  private readonly middlewareModule = new MiddlewareModule();
  private readonly middlewareContainer = new MiddlewareContainer(
    this.container,
  );
  private readonly microservicesModule =
    MicroservicesModule && new MicroservicesModule();
  private readonly socketModule = SocketModule && new SocketModule();
  private readonly routesResolver: Resolver;
  private readonly microservices: any[] = [];
  private httpServer: any;
  private isListening = false;

  constructor(
    container: NestContainer,
    private readonly httpAdapter: HttpServer,
    private readonly config: ApplicationConfig,
    private readonly appOptions: NestApplicationOptions = {},
  ) {
    super(container);

    this.selectContextModule();
    this.registerHttpServer();

    this.routesResolver = new RoutesResolver(
      this.container,
      this.config,
      this.injector,
    );
  }

  protected async dispose(): Promise<void> {
    this.socketModule && (await this.socketModule.close());
    this.microservicesModule && (await this.microservicesModule.close());
    this.httpAdapter && (await this.httpAdapter.close());

    await Promise.all(
      iterate(this.microservices).map(async microservice => {
        microservice.setIsTerminated(true);
        await microservice.close();
      }),
    );
  }

  public getHttpAdapter(): AbstractHttpAdapter {
    return this.httpAdapter as AbstractHttpAdapter;
  }

  public registerHttpServer() {
    this.httpServer = this.createServer();
  }

  public getUnderlyingHttpServer<T>(): T {
    return this.httpAdapter.getHttpServer();
  }

  public applyOptions() {
    if (!this.appOptions || !this.appOptions.cors) {
      return undefined;
    }
    const passCustomOptions =
      isObject(this.appOptions.cors) ||
      typeof this.appOptions.cors === 'function';
    if (!passCustomOptions) {
      return this.enableCors();
    }
    return this.enableCors(
      this.appOptions.cors as CorsOptions | CorsOptionsDelegate<any>,
    );
  }

  public createServer<T = any>(): T {
    this.httpAdapter.initHttpServer(this.appOptions);
    return this.httpAdapter.getHttpServer() as T;
  }

  public async registerModules() {
    this.registerWsModule();

    if (this.microservicesModule) {
      this.microservicesModule.register(this.container, this.config);
      this.microservicesModule.setupClients(this.container);
    }
    await this.middlewareModule.register(
      this.middlewareContainer,
      this.container,
      this.config,
      this.injector,
      this.httpAdapter,
    );
  }

  public registerWsModule() {
    if (!this.socketModule) {
      return;
    }
    this.socketModule.register(this.container, this.config, this.httpServer);
  }

  public async init(): Promise<this> {
    this.applyOptions();
    await this.httpAdapter?.init();

    const useBodyParser =
      this.appOptions && this.appOptions.bodyParser !== false;
    useBodyParser && this.registerParserMiddleware();

    await this.registerModules();
    await this.registerRouter();
    await this.callInitHook();
    await this.registerRouterHooks();
    await this.callBootstrapHook();

    this.isInitialized = true;
    this.logger.log(MESSAGES.APPLICATION_READY);
    return this;
  }

  public registerParserMiddleware() {
    this.httpAdapter.registerParserMiddleware();
  }

  public async registerRouter() {
    await this.registerMiddleware(this.httpAdapter);

    const prefix = this.config.getGlobalPrefix();
    const basePath = addLeadingSlash(prefix);
    this.routesResolver.resolve(this.httpAdapter, basePath);
  }

  public async registerRouterHooks() {
    this.routesResolver.registerNotFoundHandler();
    this.routesResolver.registerExceptionHandler();
  }

  public connectMicroservice<T extends object>(
    microserviceOptions: T,
    hybridAppOptions: NestHybridApplicationOptions = {},
  ): INestMicroservice {
    const { NestMicroservice } = loadPackage(
      '@nestjs/microservices',
      'NestFactory',
      () => require('@nestjs/microservices'),
    );
    const { inheritAppConfig } = hybridAppOptions;
    const applicationConfig = inheritAppConfig
      ? this.config
      : new ApplicationConfig();

    const instance = new NestMicroservice(
      this.container,
      microserviceOptions,
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

  public async startAllMicroservices(): Promise<this> {
    await Promise.all(this.microservices.map(msvc => msvc.listen()));
    return this;
  }

  public startAllMicroservicesAsync(): Promise<this> {
    this.logger.warn(
      'DEPRECATED! "startAllMicroservicesAsync" method is deprecated and will be removed in the next major release. Please, use "startAllMicroservices" instead.',
    );
    return this.startAllMicroservices();
  }

  public use(...args: [any, any?]): this {
    this.httpAdapter.use(...args);
    return this;
  }

  public enableCors(options?: CorsOptions | CorsOptionsDelegate<any>): void {
    this.httpAdapter.enableCors(options);
  }

  public enableVersioning(
    options: VersioningOptions = { type: VersioningType.URI },
  ): this {
    this.config.enableVersioning(options);
    return this;
  }

  public async listen(port: number | string): Promise<any>;
  public async listen(port: number | string, hostname: string): Promise<any>;
  public async listen(port: number | string, ...args: any[]): Promise<any> {
    !this.isInitialized && (await this.init());

    return new Promise((resolve, reject) => {
      const errorHandler = (e: any) => {
        this.logger.error(e?.toString?.());
        reject(e);
      };
      this.httpServer.once('error', errorHandler);

      const isCallbackInOriginalArgs = isFunction(args[args.length - 1]);
      const listenFnArgs = isCallbackInOriginalArgs
        ? args.slice(0, args.length - 1)
        : args;

      this.httpAdapter.listen(
        port,
        ...listenFnArgs,
        (...originalCallbackArgs: unknown[]) => {
          if (this.appOptions?.autoFlushLogs) {
            this.flushLogs();
          }
          const address = this.httpServer.address();
          if (address) {
            this.httpServer.removeListener('error', errorHandler);
            this.isListening = true;
            resolve(this.httpServer);
          }
          if (isCallbackInOriginalArgs) {
            args[args.length - 1](...originalCallbackArgs);
          }
        },
      );
    });
  }

  public listenAsync(port: number | string, ...args: any[]): Promise<any> {
    this.logger.warn(
      'DEPRECATED! "listenAsync" method is deprecated and will be removed in the next major release. Please, use "listen" instead.',
    );
    return this.listen(port, ...(args as [any]));
  }

  public async getUrl(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isListening) {
        this.logger.error(MESSAGES.CALL_LISTEN_FIRST);
        reject(MESSAGES.CALL_LISTEN_FIRST);
      }
      const address = this.httpServer.address();
      resolve(this.formatAddress(address));
    });
  }

  private formatAddress(address: any): string {
    if (typeof address === 'string') {
      if (platform() === 'win32') {
        return address;
      }
      const basePath = encodeURIComponent(address);
      return `${this.getProtocol()}+unix://${basePath}`;
    }
    let host = this.host();
    if (address && address.family === 'IPv6') {
      if (host === '::') {
        host = '[::1]';
      } else {
        host = `[${host}]`;
      }
    } else if (host === '0.0.0.0') {
      host = '127.0.0.1';
    }

    return `${this.getProtocol()}://${host}:${address.port}`;
  }

  public setGlobalPrefix(prefix: string, options?: GlobalPrefixOptions): this {
    this.config.setGlobalPrefix(prefix);
    if (options) {
      const exclude = options?.exclude.map(
        (route: string | RouteInfo): ExcludeRouteMetadata => {
          if (isString(route)) {
            return {
              requestMethod: RequestMethod.ALL,
              pathRegex: pathToRegexp(addLeadingSlash(route)),
            };
          }
          return {
            requestMethod: route.method,
            pathRegex: pathToRegexp(addLeadingSlash(route.path)),
          };
        },
      );
      this.config.setGlobalPrefixOptions({
        ...options,
        exclude,
      });
    }
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
  public useStaticAssets(path: string, options?: any): this;
  public useStaticAssets(pathOrOptions: any, options?: any): this {
    this.httpAdapter.useStaticAssets &&
      this.httpAdapter.useStaticAssets(pathOrOptions, options);
    return this;
  }

  public setBaseViewsDir(path: string | string[]): this {
    this.httpAdapter.setBaseViewsDir && this.httpAdapter.setBaseViewsDir(path);
    return this;
  }

  public setViewEngine(engineOrOptions: any): this {
    this.httpAdapter.setViewEngine &&
      this.httpAdapter.setViewEngine(engineOrOptions);
    return this;
  }
  private host(): string | undefined {
    const address = this.httpServer.address();
    if (typeof address === 'string') {
      return undefined;
    }
    return address && address.address;
  }

  private getProtocol(): 'http' | 'https' {
    return this.appOptions && this.appOptions.httpsOptions ? 'https' : 'http';
  }

  private async registerMiddleware(instance: any) {
    await this.middlewareModule.registerMiddleware(
      this.middlewareContainer,
      instance,
    );
  }
}
