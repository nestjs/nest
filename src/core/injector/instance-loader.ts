import { NestContainer } from './container';
import { Injector } from './injector';
import { Injectable } from '../../common/interfaces/injectable.interface';
import { Controller } from '../../common/interfaces/controller.interface';
import { Module } from './module';
import { Logger } from '../../common/services/logger.service';
import { ModuleInitMessage } from '../helpers/messages';
import { isUndefined, isNil } from '../../common/utils/shared.utils';
import { OnModuleInit } from '../../common/interfaces/index';

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
        modules.forEach((module, name) => {
            this.createInstancesOfComponents(module);
            this.createInstancesOfRoutes(module);
            this.callModuleInitHook(module);

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
        components.map(([key, {instance}]) => instance)
                .filter((instance) => !isNil(instance))
                .filter(this.hasOnModuleInitHook)
                .forEach((instance) => (instance as OnModuleInit).onModuleInit());
    }

    private hasOnModuleInitHook(instance: Controller | Injectable): instance is OnModuleInit {
        return !isUndefined((instance as OnModuleInit).onModuleInit);
    }
}