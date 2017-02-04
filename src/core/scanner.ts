import "reflect-metadata";
import { NestContainer } from "./injector/container";
import { NestModule } from "../common/interfaces/nest-module.interface";
import { Controller } from "../common/interfaces/controller.interface";
import { Injectable } from "../common/interfaces/injectable.interface";

export class DependenciesScanner {

    constructor(private container: NestContainer) {}

    scan(module: NestModule) {
        this.scanForModules(module);
        this.scanModulesForDependencies();
    }

    private scanForModules(module: NestModule) {
        this.storeModule(module);

        const innerModules = Reflect.getMetadata('modules', module) || [];
        innerModules.map((module) => this.scanForModules(module));
    }

    private storeModule(module: NestModule) {
        this.container.addModule(module);
    }

    private scanModulesForDependencies() {
        const modules = this.container.getModules();

        modules.forEach((deps, module) => {
            this.reflectRelatedModules(module);
            this.reflectComponents(module);
            this.reflectRoutes(module);
            this.reflectExports(module);
        });
    }


    private reflectRelatedModules(module: NestModule) {
        const modules = Reflect.getMetadata('modules', module) || [];
        modules.map((related) => this.storeRelatedModule(related, module));
    }

    private reflectComponents(module: NestModule) {
        const components = Reflect.getMetadata('components', module) || [];
        components.map((component) => this.storeComponent(component, module));
    }

    private reflectRoutes(module: NestModule) {
        const routes = Reflect.getMetadata('controllers', module) || [];
        routes.map((route) => this.storeRoute(route, module));
    }

    private reflectExports(module: NestModule) {
        const exports = Reflect.getMetadata('exports', module) || [];
        exports.map((exportedComponent) => this.storeExportedComponent(exportedComponent, module));
    }

    private storeRelatedModule(related: NestModule, module: NestModule) {
        this.container.addRelatedModule(related, module);
    }

    private storeComponent(component: Injectable, module: NestModule) {
        this.container.addComponent(component, module);
    }

    private storeExportedComponent(exportedComponent: Injectable, module: NestModule) {
        this.container.addExportedComponent(exportedComponent, module);
    }

    private storeRoute(route: Controller, module: NestModule) {
        this.container.addRoute(route, module);
    }

}