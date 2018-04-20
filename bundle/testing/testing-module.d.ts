import { NestContainer } from '@nestjs/core/injector/container';
import { NestApplicationContext } from '@nestjs/core';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { INestApplication, INestMicroservice } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { HttpServer } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/core/adapters/fastify-adapter';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { INestFastifyApplication } from '@nestjs/common/interfaces/nest-fastify-application.interface';
import { INestExpressApplication } from '@nestjs/common/interfaces/nest-express-application.interface';
export declare class TestingModule extends NestApplicationContext {
    private readonly applicationConfig;
    constructor(container: NestContainer, scope: Type<any>[], contextModule: any, applicationConfig: ApplicationConfig);
    createNestApplication(httpServer?: FastifyAdapter, options?: NestApplicationOptions): INestApplication & INestFastifyApplication;
    createNestApplication(httpServer?: HttpServer, options?: NestApplicationOptions): INestApplication & INestExpressApplication;
    createNestApplication(httpServer?: any, options?: NestApplicationOptions): INestApplication & INestExpressApplication;
    createNestMicroservice(options: MicroserviceOptions): INestMicroservice;
    private applyExpressAdapter(httpAdapter);
}
