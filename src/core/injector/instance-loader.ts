import { NestContainer, ModuleDependencies } from "./container";
import { Injector } from "./injector";
import { Injectable } from "../../common/interfaces/injectable.interface";
import { Controller } from "../../common/interfaces/controller.interface";

export class InstanceLoader {
    private injector = new Injector();

    constructor(private container: NestContainer) {}

    createInstancesOfDependencies() {
        const modules = this.container.getModules();

        this.createPrototypes(modules);
        this.createInstances(modules);
    }

    private createPrototypes(modules) {
        modules.forEach((module) => {
            this.createPrototypesOfComponents(module);
            this.createPrototypesOfRoutes(module);
        });
    }

    private createInstances(modules) {
        modules.forEach((module) => {
            this.createInstancesOfComponents(module);
            this.createInstancesOfRoutes(module);
        })
    }

    private createPrototypesOfComponents(module: ModuleDependencies) {
        module.components.forEach((wrapper, componentType) => {
            this.injector.loadPrototypeOfInstance<Injectable>(componentType, module.components);
        });
    }

    private createInstancesOfComponents(module: ModuleDependencies) {
        module.components.forEach((wrapper, componentType) => {
            this.injector.loadInstanceOfComponent(componentType, module);
        });
    }

    private createPrototypesOfRoutes(module: ModuleDependencies) {
        module.routes.forEach((wrapper, routeType) => {
            this.injector.loadPrototypeOfInstance<Controller>(routeType, module.routes);
        });
    }

    private createInstancesOfRoutes(module: ModuleDependencies) {
        module.routes.forEach((wrapper, routeType) => {
            this.injector.loadInstanceOfRoute(routeType, module);
        });
    }

}