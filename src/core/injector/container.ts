import { Controller, Injectable, NestModule } from "../../common/interfaces/";
import { UnkownExportException } from "../../errors/exceptions/unkown-export.exception";

export class NestContainer {
    private readonly modules = new Map<NestModule, ModuleDependencies>();

    addModule(moduleClass) {
        if(!this.modules.has(moduleClass)) {
            this.modules.set(moduleClass, {
                instance: new moduleClass(),
                relatedModules: new Set<ModuleDependencies>(),
                components: new Map<Injectable, InstanceWrapper<Injectable>>(),
                routes: new Map<Controller, InstanceWrapper<Controller>>(),
                exports: new Set<Injectable>(),
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

            storedModule.relatedModules.add(related);
        }
    }

    addComponent(component: Injectable, module: NestModule) {
        if(this.modules.has(module)) {
            const storedModule = this.modules.get(module);
            storedModule.components.set(component, {
                instance: null,
                isResolved: false,
            });
        }
    }

    addExportedComponent(exportedComponent: Injectable, module: NestModule) {
        if(this.modules.has(module)) {
            const storedModule = this.modules.get(module);
            if (!storedModule.components.get(exportedComponent)) {
                throw new UnkownExportException();
            }
            storedModule.exports.add(exportedComponent);
        }

    }

    addRoute(route: Controller, module: NestModule) {
        if(this.modules.has(module)) {
            const storedModule = this.modules.get(module);
            storedModule.routes.set(route, {
                instance: null,
                isResolved: false,
            });
        }
    }

}

export interface ModuleDependencies {
    instance: NestModule;
    relatedModules?: Set<ModuleDependencies>;
    components?: Map<Injectable, InstanceWrapper<Injectable>>;
    routes?: Map<Controller, InstanceWrapper<Controller>>;
    exports?: Set<Injectable>;
}

export interface InstanceWrapper<T> {
    instance: T;
    isResolved: boolean;
}