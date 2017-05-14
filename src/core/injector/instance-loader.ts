import iterate from 'iterare';
import { NestContainer } from './container';
import { Injector } from './injector';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Module } from './module';
import { Logger, OnModuleInit } from '@nestjs/common';
import { ModuleInitMessage } from '../helpers/messages';
import { isUndefined, isNil } from '@nestjs/common/utils/shared.utils';

export class InstanceLoader {
    private injector = new Injector();
    private readonly logger = new Logger(InstanceLoader.name);

    constructor(private container: NestContainer) {}

    public createInstancesOfDependencies() {
        const modules = this.container.getModules();

        this.createPrototypes(modules);
        this.createInstances(modules);
    }

    private createPrototypes(modules: Map<string, Module>) {
        modules.forEach((module) => {
            this.createPrototypesOfComponents(module);
            this.createPrototypesOfRoutes(module);
        });
    }

    private createInstances(modules: Map<string, Module>) {
        modules.forEach((module) => {
            this.createInstancesOfComponents(module);
            this.createInstancesOfRoutes(module);
            this.callModuleInitHook(module);

            const { name } = module.metatype;
            this.logger.log(ModuleInitMessage(name));
        });
    }

    private createPrototypesOfComponents(module: Module) {
        module.components.forEach((wrapper) => {
            this.injector.loadPrototypeOfInstance<Injectable>(wrapper, module.components);
        });
    }

    private createInstancesOfComponents(module: Module) {
        module.components.forEach((wrapper) => {
            this.injector.loadInstanceOfComponent(wrapper, module);
        });
    }

    private createPrototypesOfRoutes(module: Module) {
        module.routes.forEach((wrapper) => {
            this.injector.loadPrototypeOfInstance<Controller>(wrapper, module.routes);
        });
    }

    private createInstancesOfRoutes(module: Module) {
        module.routes.forEach((wrapper) => {
            this.injector.loadInstanceOfRoute(wrapper, module);
        });
    }

    private callModuleInitHook(module: Module) {
        const components = [...module.routes, ...module.components];
        iterate(components).map(([key, {instance}]) => instance)
                .filter((instance) => !isNil(instance))
                .filter(this.hasOnModuleInitHook)
                .forEach((instance) => (instance as OnModuleInit).onModuleInit());
    }

    private hasOnModuleInitHook(instance: Controller | Injectable): instance is OnModuleInit {
        return !isUndefined((instance as OnModuleInit).onModuleInit);
    }
}