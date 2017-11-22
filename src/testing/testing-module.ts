import * as optional from 'optional';
import { NestContainer } from '@nestjs/core/injector/container';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { NestApplication, NestApplicationContext } from '@nestjs/core';
import { INestApplication, INestMicroservice } from '@nestjs/common';
import { MicroserviceConfiguration } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { MicroservicesPackageNotFoundException } from '@nestjs/core/errors/exceptions/microservices-package-not-found.exception';

const { NestMicroservice } = optional('@nestjs/microservices/nest-microservice') || {} as any;

export class TestingModule extends NestApplicationContext {
    constructor(container: NestContainer, scope: NestModuleMetatype[], contextModule) {
        super(container, scope, contextModule);
    }

    public createNestApplication(express?): INestApplication {
        return new NestApplication(this.container, express);
    }

    public createNestMicroservice(config: MicroserviceConfiguration): INestMicroservice {
        if (!NestMicroservice) {
            throw new MicroservicesPackageNotFoundException();
        }
        return new NestMicroservice(this.container, config);
    }
}