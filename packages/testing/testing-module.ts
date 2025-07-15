import {
  HttpServer,
  INestApplication,
  INestMicroservice,
  Logger,
  NestApplicationOptions,
  Type,
} from '@nestjs/common';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import {
  AbstractHttpAdapter,
  NestApplication,
  NestApplicationContext,
} from '@nestjs/core';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { NestContainer } from '@nestjs/core/injector/container';
import { Module } from '@nestjs/core/injector/module';
import { GraphInspector } from '@nestjs/core/inspector/graph-inspector';

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
    const { NestMicroservice } = loadPackage(
      '@nestjs/microservices',
      'TestingModule',
      () => require('@nestjs/microservices'),
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
    const { ExpressAdapter } = loadPackage(
      '@nestjs/platform-express',
      'NestFactory',
      () => require('@nestjs/platform-express'),
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
