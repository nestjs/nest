import {
  HttpServer,
  INestApplication,
  INestMicroservice,
  Logger,
} from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { INestExpressApplication } from '@nestjs/common/interfaces/nest-express-application.interface';
import { INestFastifyApplication } from '@nestjs/common/interfaces/nest-fastify-application.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { NestApplication, NestApplicationContext } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/core/adapters/express-adapter';
import { ExpressFactory } from '@nestjs/core/adapters/express-factory';
import { FastifyAdapter } from '@nestjs/core/adapters/fastify-adapter';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { NestContainer } from '@nestjs/core/injector/container';
import { Module } from '@nestjs/core/injector/module';

export class TestingModule extends NestApplicationContext {
  constructor(
    container: NestContainer,
    scope: Type<any>[],
    contextModule: Module,
    private readonly applicationConfig: ApplicationConfig,
  ) {
    super(container, scope, contextModule);
  }

  public createNestApplication(
    httpServer?: HttpServer,
    options?: NestApplicationOptions,
  ): INestApplication & INestExpressApplication;
  public createNestApplication(
    httpServer?: FastifyAdapter,
    options?: NestApplicationOptions,
  ): INestApplication & INestFastifyApplication;
  public createNestApplication(
    httpServer?: any,
    options?: NestApplicationOptions,
  ): INestApplication & INestExpressApplication;
  public createNestApplication(
    httpServer: any = ExpressFactory.create(),
    options?: NestApplicationOptions,
  ): INestApplication & (INestExpressApplication | INestFastifyApplication) {
    httpServer = this.applyExpressAdapter(httpServer);

    this.applyLogger(options);
    this.container.setApplicationRef(httpServer);

    return new NestApplication(
      this.container,
      httpServer,
      this.applicationConfig,
      options,
    );
  }

  public createNestMicroservice(
    options: NestMicroserviceOptions & MicroserviceOptions,
  ): INestMicroservice {
    const { NestMicroservice } = loadPackage(
      '@nestjs/microservices',
      'TestingModule',
    );
    this.applyLogger(options);
    return new NestMicroservice(
      this.container,
      options,
      this.applicationConfig,
    );
  }

  private applyExpressAdapter(httpAdapter: HttpServer): HttpServer {
    const isAdapter = httpAdapter.getHttpServer;
    if (isAdapter) {
      return httpAdapter;
    }
    return new ExpressAdapter(httpAdapter);
  }

  private applyLogger(
    options: NestApplicationContextOptions | undefined,
  ): void {
    if (!options || !options.logger) {
      return undefined;
    }
    Logger.overrideLogger(options.logger);
  }
}
