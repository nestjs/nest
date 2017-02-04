import { NestContainer, ModuleDependencies } from "./container";
import { Injector } from "./instance-loader";

export class InstanceLoader {
    private injector = new Injector();

    constructor(private container: NestContainer) {}

    createInstancesOfDependencies() {
        const modules = this.container.getModules();
        modules.forEach((module) => {
            this.createInstancesOfComponents(module);
            this.createInstancesOfRoutes(module);
        })
    }

    private createInstancesOfComponents(module: ModuleDependencies) {
        module.components.forEach((wrapper, componentType) => {
            this.injector.loadInstanceOfComponent(componentType, module);
        });
    }

    private createInstancesOfRoutes(module: ModuleDependencies) {
        module.routes.forEach((wrapper, routeType) => {
            this.injector.loadInstanceOfRoute(routeType, module);
        });
    }

}