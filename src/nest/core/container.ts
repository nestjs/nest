import "reflect-metadata";
import { Route, Component, AppModule } from "./interfaces";

export class NestContainer {
    private readonly modules = new Map<AppModule, ModuleDependencies>();

    addModule(module: AppModule) {
        if(!this.modules.has(module)) {
            this.modules.set(module, {
                components: new Map<Component, InstanceWrapper<any>>(),
                routes: new Map<Route, InstanceWrapper<Route>>(),
            });
        }
    }

    getModules(): Map<AppModule, ModuleDependencies> {
        return this.modules;
    }

    addComponent(component: any, module: AppModule) {
        if(this.modules.has(module)) {
            const storedModule = this.modules.get(module);
            storedModule.components.set(component, {
                instance: null,
            });
        }
    }

    addRoute(route: Route, module: AppModule) {
        if(this.modules.has(module)) {
            const storedModule = this.modules.get(module);
            storedModule.routes.set(route, {
                instance: null,
            });
        }
    }

}

export interface ModuleDependencies {
    components?: Map<Component, InstanceWrapper<Component>>;
    routes?: Map<Route, InstanceWrapper<Route>>;
}

export interface InstanceWrapper<T> {
    instance: T;
}