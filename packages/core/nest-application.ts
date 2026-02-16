import {
  type CanActivate,
  type ExceptionFilter,
  type HttpServer,
  type INestApplication,
  type INestMicroservice,
  type NestHybridApplicationOptions,
  type NestInterceptor,
  type PipeTransform,
  type VersioningOptions,
  VersioningType,
  type WebSocketAdapter,
} from '@nestjs/common';
import { iterate } from 'iterare';
import { platform } from 'os';
import { AbstractHttpAdapter } from './adapters/index.js';
import { ApplicationConfig } from './application-config.js';
import { MESSAGES } from './constants.js';
import { optionalRequire } from './helpers/optional-require.js';
import { NestContainer } from './injector/container.js';
import { Injector } from './injector/injector.js';
import { GraphInspector } from './inspector/graph-inspector.js';
import { MiddlewareContainer } from './middleware/container.js';
import { MiddlewareModule } from './middleware/middleware-module.js';
import { mapToExcludeRoute } from './middleware/utils.js';
import { NestApplicationContext } from './nest-application-context.js';
import { Resolver } from './router/interfaces/resolver.interface.js';
import { RoutesResolver } from './router/routes-resolver.js';
import { type NestApplicationOptions, Logger } from '@nestjs/common';
import {
  type GlobalPrefixOptions,
  loadPackage,
  loadPackageCached,
  addLeadingSlash,
  isFunction,
  isObject,
  isString,
} from '@nestjs/common/internal';

/**
 * @publicApi
 */
export class NestApplication
  extends NestApplicationContext<NestApplicationOptions>
  implements INestApplication
{
  protected readonly logger = new Logger(NestApplication.name, {
    timestamp: true,
  });
  private readonly middlewareModule: MiddlewareModule;
  private readonly middlewareContainer = new MiddlewareContainer(
    this.container,
  );
  private microservicesModule: any = null;
  private socketModule: any = null;
  private readonly routesResolver: Resolver;
  private readonly microservices: any[] = [];
  private httpServer: any;
  private isListening = false;

  constructor(
    container: NestContainer,
    private readonly httpAdapter: HttpServer,
    private readonly config: ApplicationConfig,
    private readonly graphInspector: GraphInspector,
    appOptions: NestApplicationOptions = {},
  ) {
    super(container, appOptions);

    this.selectContextModule();
    this.registerHttpServer();
    this.injector = new Injector({
      preview: this.appOptions.preview!,
      instanceDecorator: appOptions.instrument?.instanceDecorator,
    });
    this.middlewareModule = new MiddlewareModule();
    this.routesResolver = new RoutesResolver(
      this.container,
      this.config,
      this.injector,
      this.graphInspector,
    );
  }

  protected async prepareClose(): Promise<void> {
    this.httpAdapter && (await this.httpAdapter.beforeClose?.());
  }

  protected async dispose(): Promise<void> {
    await this.socketModule?.close();
    await this.microservicesModule?.close();
    await this.httpAdapter?.close();

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
      isObject(this.appOptions.cors) || isFunction(this.appOptions.cors);
    if (!passCustomOptions) {
      return this.enableCors();
    }
    return this.enableCors(this.appOptions.cors);
  }

  public createServer<T = any>(): T {
    this.httpAdapter.initHttpServer(this.appOptions);
    return this.httpAdapter.getHttpServer() as T;
  }

  public async registerModules() {
    this.registerWsModule();

    if (this.microservicesModule) {
      this.microservicesModule.register(
        this.container,
        this.graphInspector,
        this.config,
        this.appOptions,
      );
      this.microservicesModule.setupClients(this.container);
    }

    await this.middlewareModule.register(
      this.middlewareContainer,
      this.container,
      this.config,
      this.injector,
      this.httpAdapter,
      this.graphInspector,
      this.appOptions,
    );
  }

  public registerWsModule() {
    if (!this.socketModule) {
      return;
    }
    this.socketModule.register(
      this.container,
      this.config,
      this.graphInspector,
      this.appOptions,
      this.httpServer,
    );
  }

  public async init(): Promise<this> {
    if (this.isInitialized) {
      return this;
    }

    // Lazy-load optional modules (ESM-compatible)
    await Promise.all([
      this.loadSocketModule(),
      this.loadMicroservicesModule(),
    ]);
    this.applyOptions();
    await this.httpAdapter?.init?.();

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
    const prefix = this.config.getGlobalPrefix();
    const rawBody = !!this.appOptions?.rawBody;
    this.httpAdapter.registerParserMiddleware(prefix, rawBody);
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
    const { NestMicroservice } = loadPackageCached('@nestjs/microservices');
    const { inheritAppConfig } = hybridAppOptions;
    const applicationConfig = inheritAppConfig
      ? this.config
      : new ApplicationConfig();

    const instance = new NestMicroservice(
      this.container,
      microserviceOptions,
      this.graphInspector,
      applicationConfig,
    );

    if (!hybridAppOptions.deferInitialization) {
      instance.registerListeners();
      instance.setIsInitialized(true);
      instance.setIsInitHookCalled(true);
    }

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
    this.assertNotInPreviewMode('startAllMicroservices');
    await Promise.all(this.microservices.map(msvc => msvc.listen()));
    return this;
  }

  public use(...args: [any, any?]): this {
    this.httpAdapter.use(...args);
    return this;
  }

  public useBodyParser(...args: [any, any?]): this {
    if (!('useBodyParser' in this.httpAdapter)) {
      this.logger.warn('Your HTTP Adapter does not support `.useBodyParser`.');
      return this;
    }

    const [parserType, ...otherArgs] = args;
    const rawBody = !!this.appOptions.rawBody;

    this.httpAdapter.useBodyParser?.(...[parserType, rawBody, ...otherArgs]);

    return this;
  }

  public enableCors(options?: any): void {
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
    this.assertNotInPreviewMode('listen');

    if (!this.isInitialized) {
      await this.init();
    }

    const httpAdapterHost = this.container.getHttpAdapterHostRef();
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
          if (this.appOptions?.autoFlushLogs ?? true) {
            this.flushLogs();
          }
          if (originalCallbackArgs[0] instanceof Error) {
            return reject(originalCallbackArgs[0]);
          }

          const address = this.httpServer.address();
          if (address) {
            this.httpServer.removeListener('error', errorHandler);
            this.isListening = true;

            httpAdapterHost.listening = true;
            resolve(this.httpServer);
          }
          if (isCallbackInOriginalArgs) {
            args[args.length - 1](...originalCallbackArgs);
          }
        },
      );
    });
  }

  public async getUrl(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isListening) {
        this.logger.error(MESSAGES.CALL_LISTEN_FIRST);
        reject(MESSAGES.CALL_LISTEN_FIRST);
        return;
      }
      const address = this.httpServer.address();
      resolve(this.formatAddress(address));
    });
  }

  private formatAddress(address: any): string {
    if (isString(address)) {
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
      const exclude = options?.exclude
        ? mapToExcludeRoute(options.exclude)
        : [];
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
    filters = this.applyInstanceDecoratorIfRegistered<ExceptionFilter>(
      ...filters,
    );
    this.config.useGlobalFilters(...filters);
    filters.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'filter',
        ref: item,
      }),
    );
    return this;
  }

  public useGlobalPipes(...pipes: PipeTransform<any>[]): this {
    pipes = this.applyInstanceDecoratorIfRegistered<PipeTransform<any>>(
      ...pipes,
    );
    this.config.useGlobalPipes(...pipes);
    pipes.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'pipe',
        ref: item,
      }),
    );
    return this;
  }

  public useGlobalInterceptors(...interceptors: NestInterceptor[]): this {
    interceptors = this.applyInstanceDecoratorIfRegistered<NestInterceptor>(
      ...interceptors,
    );
    this.config.useGlobalInterceptors(...interceptors);
    interceptors.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'interceptor',
        ref: item,
      }),
    );
    return this;
  }

  public useGlobalGuards(...guards: CanActivate[]): this {
    guards = this.applyInstanceDecoratorIfRegistered<CanActivate>(...guards);
    this.config.useGlobalGuards(...guards);
    guards.forEach(item =>
      this.graphInspector.insertOrphanedEnhancer({
        subtype: 'guard',
        ref: item,
      }),
    );
    return this;
  }

  public useStaticAssets(options: any): this;
  public useStaticAssets(path: string, options?: any): this;
  public useStaticAssets(pathOrOptions: any, options?: any): this {
    this.httpAdapter.useStaticAssets?.(pathOrOptions, options);
    return this;
  }

  public setBaseViewsDir(path: string | string[]): this {
    this.httpAdapter.setBaseViewsDir?.(path);
    return this;
  }

  public setViewEngine(engineOrOptions: any): this {
    this.httpAdapter.setViewEngine?.(engineOrOptions);
    return this;
  }

  /**
   * Pre-load optional packages so that createNestApplication,
   * createNestMicroservice and createHttpAdapter can stay synchronous.
   */
  public async preloadLazyPackages(): Promise<void> {
    // Best-effort: silently swallow if packages are not installed
    await loadPackage(
      '@nestjs/platform-express',
      'TestingModule',
      () => import('@nestjs/platform-express'),
    ).catch(() => {});
    await loadPackage(
      '@nestjs/microservices',
      'TestingModule',
      () => import('@nestjs/microservices'),
    ).catch(() => {});
  }

  private host(): string | undefined {
    const address = this.httpServer.address();
    if (isString(address)) {
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

  private async loadMicroservicesModule() {
    if (!this.microservicesModule) {
      const msModule = await optionalRequire(
        '@nestjs/microservices/microservices-module',
        () => import('@nestjs/microservices/microservices-module.js'),
      );
      if (msModule?.MicroservicesModule) {
        this.microservicesModule = new msModule.MicroservicesModule();
        // Pre-cache the main barrel so connectMicroservice() can stay synchronous
        await loadPackage(
          '@nestjs/microservices',
          'NestFactory',
          () => import('@nestjs/microservices'),
        );
      }
    }
  }
}
