import { NestApplication, NestMicroservice } from '@nestjs/core';
import { InstanceWrapper, NestContainer } from '@nestjs/core/injector/container';
import { ModuleTokenFactory } from '@nestjs/core/injector/module-token-factory';
import { Metatype } from '@nestjs/core/interfaces';
import { NestModuleMetatype } from '@nestjs/core/interfaces/modules/module-metatype.interface';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { DependenciesScanner } from '@nestjs/core/scanner';
import { isFunction } from '@nestjs/core/utils/shared.utils';
import { MicroserviceConfiguration } from '@nestjs/microservices';
import { UnknownModuleException } from './errors/unknown-module.exception';
import { INestApplication, INestMicroservice } from '';

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

