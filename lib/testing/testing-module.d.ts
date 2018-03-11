import { NestContainer } from '@nestjs/core/injector/container';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { NestApplicationContext } from '@nestjs/core';
import { INestApplication, INestMicroservice } from '@nestjs/common';
import { MicroserviceConfiguration } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
export declare class TestingModule extends NestApplicationContext {
    constructor(container: NestContainer, scope: NestModuleMetatype[], contextModule: any);
    createNestApplication(expressInstance?: any): INestApplication;
    createNestMicroservice(config: MicroserviceConfiguration): INestMicroservice;
}
