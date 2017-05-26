import 'reflect-metadata';
import { NestContainer } from './injector/container';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { metadata, EXCEPTION_FILTERS_METADATA } from '@nestjs/common/constants';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
import { GATEWAY_MIDDLEWARES } from '@nestjs/websockets/constants';

export class DependenciesScanner {
    constructor(private container: NestContainer) {}

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
            this.reflectGatewaysMiddlewares(component, token);
        });
    }

    private reflectControllers(module: NestModuleMetatype, token: string) {
        const routes = this.reflectMetadata(module, metadata.CONTROLLERS);
        routes.map((route) => {
            this.storeRoute(route, token);
            this.reflectExceptionFilters(route, token);
        });
    }

    private reflectExports(module: NestModuleMetatype, token: string) {
        const exports = this.reflectMetadata(module, metadata.EXPORTS);
        exports.map((exportedComponent) => this.storeExportedComponent(exportedComponent, token));
    }

    private reflectExceptionFilters(component: Metatype<Injectable>, token: string) {
        const filters = this.reflectMetadata(component, EXCEPTION_FILTERS_METADATA);
        filters.map((filter) => this.storeComponent(filter, token));
    }

    private reflectGatewaysMiddlewares(component: Metatype<Injectable>, token: string) {
        const middlewares = this.reflectMetadata(component, GATEWAY_MIDDLEWARES);
        middlewares.map((middleware) => this.storeComponent(middleware, token));
    }

    private storeRelatedModule(related: NestModuleMetatype, token: string) {
        this.container.addRelatedModule(related, token);
    }

    private storeComponent(component: Metatype<Injectable>, token: string) {
        this.container.addComponent(component, token);
    }

    private storeExportedComponent(exportedComponent: Metatype<Injectable>, token: string) {
        this.container.addExportedComponent(exportedComponent, token);
    }

    private storeRoute(route: Metatype<Controller>, token: string) {
        this.container.addController(route, token);
    }

    private reflectMetadata(module: NestModuleMetatype, metadata: string) {
        return Reflect.getMetadata(metadata, module) || [];
    }

}