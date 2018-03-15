import * as optional from 'optional';
import { NestContainer } from '@nestjs/core/injector/container';
import { NestApplication, NestApplicationContext } from '@nestjs/core';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { INestApplication, INestMicroservice } from '@nestjs/common';
import { MicroserviceConfiguration } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { MicroservicesPackageNotFoundException } from '@nestjs/core/errors/exceptions/microservices-package-not-found.exception';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { HttpServer } from '@nestjs/common';
import { ExpressFactory } from '@nestjs/core/adapters/express-factory';
import { ExpressAdapter } from '@nestjs/core/adapters/express-adapter';

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
    httpServer: HttpServer = ExpressFactory.create(),
  ): INestApplication {
    httpServer = this.applyExpressAdapter(httpServer);
    this.container.setApplicationRef(httpServer);
    return new NestApplication(
      this.container,
      httpServer,
      this.applicationConfig,
    );
  }

  public createNestMicroservice(
    config: MicroserviceConfiguration,
  ): INestMicroservice {
    if (!NestMicroservice) {
      throw new MicroservicesPackageNotFoundException();
    }
    return new NestMicroservice(
      this.container,
      config,
      this.applicationConfig,
    );
  }

  private applyExpressAdapter(httpAdapter: HttpServer): HttpServer {
    const isAdapter = !!httpAdapter.getHttpServer;
    if (isAdapter) {
      return httpAdapter;
    }
    return new ExpressAdapter(httpAdapter);
  }
}
