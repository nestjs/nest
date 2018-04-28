import * as optional from 'optional';
import { NestContainer } from '@nestjs/core/injector/container';
import { NestApplication, NestApplicationContext } from '@nestjs/core';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { INestApplication, INestMicroservice } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { MicroservicesPackageNotFoundException } from '@nestjs/core/errors/exceptions/microservices-package-not-found.exception';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { HttpServer } from '@nestjs/common';
import { ExpressFactory } from '@nestjs/core/adapters/express-factory';
import { ExpressAdapter } from '@nestjs/core/adapters/express-adapter';
import { FastifyAdapter } from '@nestjs/core/adapters/fastify-adapter';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { INestFastifyApplication } from '@nestjs/common/interfaces/nest-fastify-application.interface';
import { INestExpressApplication } from '@nestjs/common/interfaces/nest-express-application.interface';

const { NestMicroservice } =
  optional('@nestjs/microservices/nest-microservice') || ({} as any);

export class TestingModule extends NestApplicationContext {
  constructor(
    container: NestContainer,
    scope: Type<any>[],
    contextModule,
    private readonly applicationConfig: ApplicationConfig,
  ) {
    super(container, scope, contextModule);
  }

  public createNestApplication(
    httpServer?: FastifyAdapter,
    options?: NestApplicationOptions,
  ): INestApplication & INestFastifyApplication;
  public createNestApplication(
    httpServer?: HttpServer,
    options?: NestApplicationOptions,
  ): INestApplication & INestExpressApplication;
  public createNestApplication(
    httpServer?: any,
    options?: NestApplicationOptions,
  ): INestApplication & INestExpressApplication;
  public createNestApplication(
    httpServer: any = ExpressFactory.create(),
    options?: NestApplicationOptions,
  ): INestApplication & (INestExpressApplication | INestFastifyApplication) {
    httpServer = this.applyExpressAdapter(httpServer);
    this.container.setApplicationRef(httpServer);
    return new NestApplication(
      this.container,
      httpServer,
      this.applicationConfig,
    );
  }

  public createNestMicroservice(
    options: MicroserviceOptions,
  ): INestMicroservice {
    if (!NestMicroservice) {
      throw new MicroservicesPackageNotFoundException();
    }
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
}
