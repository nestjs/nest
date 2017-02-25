import { Controller, Injectable } from '../../common/interfaces/';
import { Module } from './module';
import { UnkownModuleException } from '../../errors/exceptions/unkown-module.exception';
import { NestModuleMetatype } from '../../common/interfaces/module-metatype.interface';
import { Metatype } from '../../common/interfaces/metatype.interface';

export class NestContainer {
    private readonly modules = new Map<string, Module>();

    addModule(metatype: NestModuleMetatype) {
        if (this.modules.has(metatype.name)) { return; }

        this.modules.set(metatype.name, new Module(metatype));
    }

    getModules(): Map<string, Module> {
        return this.modules;
    }

    addRelatedModule(relatedModule: NestModuleMetatype, target: NestModuleMetatype) {
        if (!this.modules.has(target.name)) { return; }

        const storedModule = this.modules.get(target.name);
        const related = this.modules.get(relatedModule.name);

        storedModule.addRelatedModule(related);
    }

    addComponent(component: Metatype<Injectable>, metatype: NestModuleMetatype) {
        if (!this.modules.has(metatype.name)) {
            throw new UnkownModuleException();
        }

        const storedModule = this.modules.get(metatype.name);
        storedModule.addComponent(component);
    }

    addExportedComponent(exportedComponent: Metatype<Injectable>, metatype: NestModuleMetatype) {
        if (!this.modules.has(metatype.name)) {
            throw new UnkownModuleException();
        }

        const storedModule = this.modules.get(metatype.name);
        storedModule.addExportedComponent(exportedComponent);
    }

    addRoute(controller: Metatype<Controller>, metatype: NestModuleMetatype) {
        if(!this.modules.has(metatype.name)) {
            throw new UnkownModuleException();
        }

        const storedModule = this.modules.get(metatype.name);
        storedModule.addRoute(controller);
    }

    clear() {
        this.modules.clear();
    }

}

export interface InstanceWrapper<T> {
    metatype: Metatype<T>;
    instance: T;
    isResolved: boolean;
}