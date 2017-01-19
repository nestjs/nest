import "reflect-metadata";
import { AppModule, Route } from "./interfaces";
import { NestContainer } from "./container";

export class NestDependenciesScanner {

    constructor(private container: NestContainer) {}

    scan(module: AppModule) {
        this.scanForModules(module);
        this.scanModulesForDependencies();
    }

    private scanForModules(module: AppModule) {
        this.storeModule(module);

        const innerModules = Reflect.getMetadata('modules', module) || [];
        innerModules.map((module) => this.scanForModules(module));
    }

    private storeModule(module: AppModule) {
        this.container.addModule(module);
    }

    private scanModulesForDependencies() {
        const modules = this.container.getModules();

        modules.forEach((deps, module) => {
            const modules = Reflect.getMetadata('modules', module) || [];
            modules.map((related) => this.storeRelatedModule(related, module));

            const components = Reflect.getMetadata('components', module) || [];
            components.map((component) => this.storeComponent(component, module));

            const routes = Reflect.getMetadata('routes', module) || [];
            routes.map((route) => this.storeRoute(route, module));

            const exports = Reflect.getMetadata('exports', module) || [];
            exports.map((exportedComponent) => this.storeExportedComponent(exportedComponent, module));
        });
    }

    private storeRelatedModule(related, module: AppModule) {
        this.container.addRelatedModule(related, module);
    }

    private storeComponent(component, module: AppModule) {
        this.container.addComponent(component, module);
    }

    private storeExportedComponent(exportedComponent, module: AppModule) {
        this.container.addExportedComponent(exportedComponent, module);
    }

    private storeRoute(route: Route, module: AppModule) {
        this.container.addRoute(route, module);
    }

}