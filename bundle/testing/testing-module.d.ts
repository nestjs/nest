import { NestContainer } from '@nestjs/core/injector/container';
import { NestApplicationContext } from '@nestjs/core';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { INestApplication, INestMicroservice } from '@nestjs/common';
import { MicroserviceConfiguration } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { HttpServer } from '@nestjs/common';
export declare class TestingModule extends NestApplicationContext {
  private readonly applicationConfig;
  constructor(
    container: NestContainer,
    scope: Type<any>[],
    contextModule: any,
    applicationConfig: ApplicationConfig,
  );
  createNestApplication(httpServer?: HttpServer): INestApplication;
  createNestMicroservice(config: MicroserviceConfiguration): INestMicroservice;
  private applyExpressAdapter(httpAdapter);
}
