import {
  HttpServer,
  INestApplication,
  INestMicroservice,
  Logger,
  NestApplicationOptions,
  Type,
} from '@nestjs/common';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface.js';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface.js';
import {
  loadPackage,
  loadPackageCached,
} from '@nestjs/common/utils/load-package.util.js';
import { isUndefined } from '@nestjs/common/utils/shared.utils.js';
import {
  AbstractHttpAdapter,
  NestApplication,
  NestApplicationContext,
} from '@nestjs/core';
import { ApplicationConfig } from '@nestjs/core/application-config.js';
import { NestContainer } from '@nestjs/core/injector/container.js';
import { Module } from '@nestjs/core/injector/module.js';
import { GraphInspector } from '@nestjs/core/inspector/graph-inspector.js';

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
    const { NestMicroservice } = loadPackageCached('@nestjs/microservices');
    this.applyLogger(options);
    return new NestMicroservice(
      this.container,
      options,
      this.graphInspector,
      this.applicationConfig,
    );
  }

  private createHttpAdapter<T = any>(httpServer?: T): AbstractHttpAdapter {
    const { ExpressAdapter } = loadPackageCached('@nestjs/platform-express');
    return new ExpressAdapter(httpServer);
  }

  private applyLogger(options: NestApplicationContextOptions | undefined) {
    if (!options || isUndefined(options.logger)) {
      return;
    }
    Logger.overrideLogger(options.logger);
  }

  private createAdapterProxy<T>(app: NestApplication, adapter: HttpServer): T {
    return new Proxy(app, {
      get: (receiver: Record<string, any>, prop: string) => {
        if (!(prop in receiver) && prop in adapter) {
          return adapter[prop];
        }
        return receiver[prop];
      },
    }) as any as T;
  }
}
