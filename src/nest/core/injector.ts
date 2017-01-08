import "reflect-metadata";
import { NestContainer, ModuleDependencies } from "./container";
import { NestInstanceLoader } from "./instance-loader";

export class NestInjector {
    private instanceLoader = new NestInstanceLoader();

    constructor(private container: NestContainer) {}

    createInstancesOfDependencies() {
        const modules = this.container.getModules();
        modules.forEach((module) => {
            this.createInstancesOfComponents(module);
            this.createInstancesOfRoutes(module);
        })
    }

    private createInstancesOfComponents(module: ModuleDependencies) {
        module.components.forEach((wrapper, type) => {
            this.instanceLoader.loadInstanceOfComponent(type, module.components);
        });
    }

    private createInstancesOfRoutes(module: ModuleDependencies) {
        module.routes.forEach((wrapper, type) => {
            this.instanceLoader.loadInstanceOfRoute(type, module.routes, module.components);
        });
    }

}