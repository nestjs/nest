import { NestContainer, InstanceWrapper } from '@nestjs/core/injector/container';
import { DependenciesScanner } from '@nestjs/core/scanner';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { Metatype } from '@nestjs/common/interfaces';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { ModuleTokenFactory } from '@nestjs/core/injector/module-token-factory';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { UnknownModuleException } from './errors/unknown-module.exception';

export class TestingModule {
    private readonly moduleTokenFactory = new ModuleTokenFactory();

    constructor(
        private readonly container: NestContainer,
        private readonly scope: NestModuleMetatype[],
        private readonly contextModule) {}

    public select<T>(module: Metatype<T>): TestingModule {
        const modules = this.container.getModules();
        const moduleMetatype = this.contextModule.metatype;
        const scope = this.scope.concat(moduleMetatype);

        const token = this.moduleTokenFactory.create(module, scope);
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

