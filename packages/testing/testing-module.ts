import {
  type HttpServer,
  type INestApplication,
  type INestMicroservice,
  Logger,
  type NestApplicationOptions,
  type Type,
} from '@nestjs/common';
import {
  type AbstractHttpAdapter,
  NestApplication,
  NestApplicationContext,
} from '@nestjs/core';
import {
  type NestMicroserviceOptions,
  type NestApplicationContextOptions,
  tryLoadPackage,
  loadPackageCached,
  isFunction,
  isUndefined,
} from '@nestjs/common/internal';
import type {
  ApplicationConfig,
  NestContainer,
  GraphInspector,
} from '@nestjs/core';
import type { Module } from '@nestjs/core/internal';

/**
 * @publicApi
 */
export class TestingModule extends NestApplicationContext {
  protected readonly graphInspector: GraphInspector;

  constructor(
    container: NestContainer,
    graphInspector: GraphInspector,
    contextModule: Module,
    private readonly applicationConfig: ApplicationConfig,
    scope: Type<any>[] = [],
  ) {
    const options = {};
    super(container, options, contextModule, scope);

    this.graphInspector = graphInspector;
  }

  /**
   * Pre-load optional packages so that createNestApplication,
   * createNestMicroservice and createHttpAdapter can stay synchronous.
   * Called from TestingModuleBuilder.compile().
   */
  private async preloadLazyPackages(): Promise<void> {
    await tryLoadPackage(
      '@nestjs/platform-express',
      () => import('@nestjs/platform-express'),
    );
    await tryLoadPackage(
      '@nestjs/microservices',
      () => import('@nestjs/microservices'),
    );
  }

  private isHttpServer(
    serverOrOptions:
      | HttpServer
      | AbstractHttpAdapter
      | NestApplicationOptions
      | undefined,
  ): serverOrOptions is HttpServer | AbstractHttpAdapter {
    return !!(serverOrOptions && (serverOrOptions as HttpServer).patch);
  }

  public createNestApplication<T extends INestApplication = INestApplication>(
    httpAdapter: HttpServer | AbstractHttpAdapter,
    options?: NestApplicationOptions,
  ): T;
  public createNestApplication<T extends INestApplication = INestApplication>(
    options?: NestApplicationOptions,
  ): T;
  public createNestApplication<T extends INestApplication = INestApplication>(
    serverOrOptions:
      | HttpServer
      | AbstractHttpAdapter
      | NestApplicationOptions
      | undefined,
    options?: NestApplicationOptions,
  ): T {
    const [httpAdapter, appOptions] = this.isHttpServer(serverOrOptions)
      ? [serverOrOptions, options]
      : [this.createHttpAdapter(), serverOrOptions];

    this.applyLogger(appOptions);
    this.container.setHttpAdapter(httpAdapter);

    const instance = new NestApplication(
      this.container,
      httpAdapter,
      this.applicationConfig,
      this.graphInspector,
      appOptions,
    );
    return this.createAdapterProxy<T>(instance, httpAdapter);
  }

  public createNestMicroservice<T extends object>(
    options: NestMicroserviceOptions & T,
  ): INestMicroservice {
    const { NestMicroservice } = loadPackageCached(
      '@nestjs/microservices',
      'TestingModule',
    );
    this.applyLogger(options);
    return new NestMicroservice(
      this.container,
      options,
      this.graphInspector,
      this.applicationConfig,
    );
  }

  private createHttpAdapter<T = any>(httpServer?: T): AbstractHttpAdapter {
    const { ExpressAdapter } = loadPackageCached(
      '@nestjs/platform-express',
      'TestingModule',
    );
    return new ExpressAdapter(httpServer);
  }

  private applyLogger(options: NestApplicationContextOptions | undefined) {
    if (!options || isUndefined(options.logger)) {
      return;
    }
    Logger.overrideLogger(options.logger);
  }

  private createAdapterProxy<T>(app: NestApplication, adapter: HttpServer): T {
    const proxy = new Proxy(app, {
      get: (receiver: Record<string, any>, prop: string) => {
        if (!(prop in receiver) && prop in adapter) {
          const value = adapter[prop];
          if (!isFunction(value)) {
            return value;
          }
          // Called on the adapter, as on applications created by NestFactory.
          // Chainable methods keep returning the application.
          return (...args: unknown[]) => {
            const result = value.apply(adapter, args);
            return result === adapter ? proxy : result;
          };
        }
        return receiver[prop];
      },
    });
    return proxy as any as T;
  }
}
