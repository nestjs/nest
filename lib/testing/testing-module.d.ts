import { NestContainer } from '@nestjs/core/injector/container';
import { NestApplicationContext } from '@nestjs/core';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { INestApplication, INestMicroservice } from '@nestjs/common';
import { MicroserviceConfiguration } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { HttpServer } from '@nestjs/common';
export declare class TestingModule extends NestApplicationContext {
    constructor(container: NestContainer, scope: Type<any>[], contextModule: any);
    createNestApplication(httpServer?: HttpServer): INestApplication;
    createNestMicroservice(config: MicroserviceConfiguration): INestMicroservice;
    private applyExpressAdapter(httpAdapter);
}
