import "reflect-metadata";
import { Route, Component, NestModule } from "./interfaces";

export class NestContainer {
    private readonly modules = new Map<NestModule, ModuleDependencies>();

    addModule(moduleClass) {
        if(!this.modules.has(moduleClass)) {
            this.modules.set(moduleClass, {
                instance: new moduleClass(),
                relatedModules: [],
                components: new Map<Component, InstanceWrapper<any>>(),
                routes: new Map<Route, InstanceWrapper<Route>>(),
                exports: new Set<Component>(),
            });
        }
    }

    getModules(): Map<NestModule, ModuleDependencies> {
        return this.modules;
    }

    addRelatedModule(relatedModule: NestModule, module: NestModule) {
        if(this.modules.has(module)) {
            const storedModule = this.modules.get(module);
            const related = this.modules.get(relatedModule);

            storedModule.relatedModules.push(related);
        }
    }

    addComponent(component: any, module: NestModule) {
        if(this.modules.has(module)) {
            const storedModule = this.modules.get(module);
            storedModule.components.set(component, {
                instance: null,
            });
        }

    }

    addExportedComponent(exportedComponent: any, module: NestModule) {
        if(this.modules.has(module)) {
            const storedModule = this.modules.get(module);
            if (!storedModule.components.get(exportedComponent)) {
                throw new Error("You are trying to export component, which is not in components array also.")
            }
            storedModule.exports.add(exportedComponent);
        }

    }

    addRoute(route: Route, module: NestModule) {
        if(this.modules.has(module)) {
            const storedModule = this.modules.get(module);
            storedModule.routes.set(route, {
                instance: null,
            });
        }
    }

}

export interface ModuleDependencies extends InstanceWrapper<NestModule> {
    relatedModules: ModuleDependencies[];
    components?: Map<Component, InstanceWrapper<Component>>;
    routes?: Map<Route, InstanceWrapper<Route>>;
    exports?: Set<Component>;
}

export interface InstanceWrapper<T> {
    instance: T;
}