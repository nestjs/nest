import { HttpServer, INestApplication, INestMicroservice } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { INestExpressApplication } from '@nestjs/common/interfaces/nest-express-application.interface';
import { INestFastifyApplication } from '@nestjs/common/interfaces/nest-fastify-application.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { NestApplicationContext } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/core/adapters/fastify-adapter';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { NestContainer } from '@nestjs/core/injector/container';
export declare class TestingModule extends NestApplicationContext {
    private readonly applicationConfig;
    constructor(container: NestContainer, scope: Type<any>[], contextModule: any, applicationConfig: ApplicationConfig);
    createNestApplication(httpServer?: HttpServer, options?: NestApplicationOptions): INestApplication & INestExpressApplication;
    createNestApplication(httpServer?: FastifyAdapter, options?: NestApplicationOptions): INestApplication & INestFastifyApplication;
    createNestApplication(httpServer?: any, options?: NestApplicationOptions): INestApplication & INestExpressApplication;
    createNestMicroservice(options: NestMicroserviceOptions & MicroserviceOptions): INestMicroservice;
    private applyExpressAdapter(httpAdapter);
    private applyLogger(options);
}
