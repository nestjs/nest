import { INestApplication, INestMicroservice } from '@nestjs/common';
import { NestApplication, NestApplicationContext } from '@nestjs/core';

import { Express } from 'express';
import { MicroserviceConfiguration } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { MicroservicesPackageNotFoundException } from '@nestjs/core/errors/exceptions/microservices-package-not-found.exception';
import { NestContainer } from '@nestjs/core/injector/container';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import optional from '@nestjs/core/optional';

const { NestMicroservice } = optional('@nestjs/microservices/nest-microservice') || {} as any;

export class TestingModule extends NestApplicationContext {
    constructor(container: NestContainer, scope: NestModuleMetatype[], contextModule: any) {
        super(container, scope, contextModule);
    }

    public createNestApplication(express?: Express): INestApplication {
        return new NestApplication(this.container, express);
    }

    public createNestMicroservice(config: MicroserviceConfiguration): INestMicroservice {
        if (!NestMicroservice) {
            throw new MicroservicesPackageNotFoundException();
        }
        return new NestMicroservice(this.container, config);
    }
}
