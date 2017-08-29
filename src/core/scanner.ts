import 'reflect-metadata';
import { NestContainer } from './injector/container';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { metadata, EXCEPTION_FILTERS_METADATA, GUARDS_METADATA, INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
import { GATEWAY_MIDDLEWARES } from '@nestjs/websockets/constants';
import { MetadataScanner } from '../core/metadata-scanner';

export class DependenciesScanner {
    constructor(
        private readonly container: NestContainer,
        private readonly metadataScanner: MetadataScanner) {}

    public scan(module: NestModuleMetatype) {
        this.scanForModules(module);
        this.scanModulesForDependencies();
    }

    private scanForModules(module: NestModuleMetatype, scope: NestModuleMetatype[] = []) {
        this.storeModule(module, scope);

        const importedModules = this.reflectMetadata(module, metadata.MODULES);
        importedModules.map((innerModule) => {
            this.scanForModules(innerModule, [].concat(scope, module));
        });
    }

    private storeModule(module: NestModuleMetatype, scope: NestModuleMetatype[]) {
        this.container.addModule(module, scope);
    }

    private scanModulesForDependencies() {
        const modules = this.container.getModules();

        modules.forEach(({ metatype }, token) => {
            this.reflectRelatedModules(metatype, token);
            this.reflectComponents(metatype, token);
            this.reflectControllers(metatype, token);
            this.reflectExports(metatype, token);
        });
    }

    private reflectRelatedModules(module: NestModuleMetatype, token: string) {
        const modules = this.reflectMetadata(module, metadata.MODULES);
        modules.map((related) => this.storeRelatedModule(related, token));
    }

    private reflectComponents(module: NestModuleMetatype, token: string) {
        const components = this.reflectMetadata(module, metadata.COMPONENTS);
        components.map((component) => {
            this.storeComponent(component, token);
            this.reflectComponentMetadata(component, token);
        });
    }

    private reflectComponentMetadata(component: Metatype<Injectable>, token: string) {
        this.reflectGatewaysMiddlewares(component, token);
    }

    private reflectControllers(module: NestModuleMetatype, token: string) {
        const routes = this.reflectMetadata(module, metadata.CONTROLLERS);
        routes.map((route) => {
            this.storeRoute(route, token);
            this.reflectControllersMetadata(route, token);
        });
    }

    private reflectControllersMetadata(route: Metatype<Injectable>, token: string) {
        this.reflectGuards(route, token);
        this.reflectInterceptors(route, token);
    }

    private reflectExports(module: NestModuleMetatype, token: string) {
        const exports = this.reflectMetadata(module, metadata.EXPORTS);
        exports.map((exportedComponent) => this.storeExportedComponent(exportedComponent, token));
    }

    private reflectGatewaysMiddlewares(component: Metatype<Injectable>, token: string) {
        const middlewares = this.reflectMetadata(component, GATEWAY_MIDDLEWARES);
        middlewares.map((middleware) => this.storeComponent(middleware, token));
    }

    private reflectGuards(component: Metatype<Injectable>, token: string) {
        const controllerGuards = this.reflectMetadata(component, GUARDS_METADATA);
        const methodsGuards = this.metadataScanner.scanFromPrototype(null, component.prototype,
            (method: string) => {
                const descriptor = Reflect.getOwnPropertyDescriptor(component.prototype, method);
                return descriptor ? Reflect.getMetadata(GUARDS_METADATA, descriptor.value) : undefined;
            },
        );
        const flattenMethodsGuards = methodsGuards.reduce((a, b) => a.concat(b), []);
        [...controllerGuards, ...flattenMethodsGuards].map((guard) => this.storeInjectable(guard, token));
    }

    private reflectInterceptors(component: Metatype<Injectable>, token: string) {
        const controllerInterceptors = this.reflectMetadata(component, INTERCEPTORS_METADATA);
        const methodsInterceptors = this.metadataScanner.scanFromPrototype(null, component.prototype,
            (method: string) => {
                const descriptor = Reflect.getOwnPropertyDescriptor(component.prototype, method);
                return descriptor ? Reflect.getMetadata(INTERCEPTORS_METADATA, descriptor.value) : undefined;
            },
        );
        const flattenMethodsInterceptors = methodsInterceptors.reduce((a, b) => a.concat(b), []);
        [...controllerInterceptors, ...flattenMethodsInterceptors].map((guard) => this.storeInjectable(guard, token));
    }

    private storeRelatedModule(related: NestModuleMetatype, token: string) {
        this.container.addRelatedModule(related, token);
    }

    private storeComponent(component: Metatype<Injectable>, token: string) {
        this.container.addComponent(component, token);
    }

    private storeInjectable(component: Metatype<Injectable>, token: string) {
        this.container.addInjectable(component, token);
    }

    private storeExportedComponent(exportedComponent: Metatype<Injectable>, token: string) {
        this.container.addExportedComponent(exportedComponent, token);
    }

    private storeRoute(route: Metatype<Controller>, token: string) {
        this.container.addController(route, token);
    }

    private reflectMetadata(metatype, metadata: string) {
        return Reflect.getMetadata(metadata, metatype) || [];
    }

}