import * as optional from 'optional';
import { NestContainer, InstanceWrapper } from '@nestjs/core/injector/container';
import { DependenciesScanner } from '@nestjs/core/scanner';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { Metatype } from '@nestjs/common/interfaces';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { ModuleTokenFactory } from '@nestjs/core/injector/module-token-factory';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { UnknownModuleException } from './errors/unknown-module.exception';
import { NestApplication } from '@nestjs/core';
import { INestApplication, INestMicroservice } from '@nestjs/common';
import { MicroserviceConfiguration } from '@nestjs/common/interfaces/microservices/microservice-configuration.interface';
import { MicroservicesPackageNotFoundException } from '@nestjs/core/errors/exceptions/microservices-package-not-found.exception';

const { NestMicroservice } = optional('@nestjs/microservices/nest-microservice') || {} as any;

export class TestingModule {
    private readonly moduleTokenFactory = new ModuleTokenFactory();

    constructor(
        private readonly container: NestContainer,
        private readonly scope: NestModuleMetatype[],
        private readonly contextModule) {}

    public createNestApplication(express?): INestApplication {
        return new NestApplication(this.container, express);
    }

    public createNestMicroservice(config: MicroserviceConfiguration): INestMicroservice {
        if (!NestMicroservice) {
            throw new MicroservicesPackageNotFoundException();
        }
        return new NestMicroservice(this.container, config);
    }

    public select<T>(module: Metatype<T>): TestingModule {
        const modules = this.container.getModules();
        const moduleMetatype = this.contextModule.metatype;
        const scope = this.scope.concat(moduleMetatype);

        const token = this.moduleTokenFactory.create(module as any, scope);
        const selectedModule = modules.get(token);
        if (!selectedModule) {
            throw new UnknownModuleException();
        }
        return new TestingModule(this.container, scope, selectedModule);
    }

    public get<T>(metatypeOrToken: Metatype<T> | string): T {
        return this.findInstanceByPrototypeOrToken<T>(metatypeOrToken);
    }

    private findInstanceByPrototypeOrToken<T>(metatypeOrToken: Metatype<T> | string) {
        const dependencies = new Map([
            ...this.contextModule.components,
            ...this.contextModule.routes,
            ...this.contextModule.injectables,
        ]);
        const name = isFunction(metatypeOrToken) ? (metatypeOrToken as any).name : metatypeOrToken;
        const instanceWrapper = dependencies.get(name);
        if (!instanceWrapper) {
            return null;
        }
        return (instanceWrapper as InstanceWrapper<any>).instance;
    }
}

