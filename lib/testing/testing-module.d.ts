import { NestContainer } from '@nestjs/core/injector/container';
import { NestApplicationContext } from '@nestjs/core';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { INestApplication, INestMicroservice } from '@nestjs/common';
import { MicroserviceConfiguration } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
export declare class TestingModule extends NestApplicationContext {
    constructor(container: NestContainer, scope: Type<any>[], contextModule: any);
    createNestApplication(expressInstance?: any): INestApplication;
    createNestMicroservice(config: MicroserviceConfiguration): INestMicroservice;
}
