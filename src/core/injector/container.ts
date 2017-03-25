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

        const module = this.modules.get(target.name);
        const related = this.modules.get(relatedModule.name);

        module.addRelatedModule(related);
    }

    addComponent(component: Metatype<Injectable>, metatype: NestModuleMetatype) {
        if (!this.modules.has(metatype.name)) {
            throw new UnkownModuleException();
        }

        const module = this.modules.get(metatype.name);
        module.addComponent(component);
    }

    addExportedComponent(exportedComponent: Metatype<Injectable>, metatype: NestModuleMetatype) {
        if (!this.modules.has(metatype.name)) {
            throw new UnkownModuleException();
        }

        const module = this.modules.get(metatype.name);
        module.addExportedComponent(exportedComponent);
    }

    addController(controller: Metatype<Controller>, metatype: NestModuleMetatype) {
        if(!this.modules.has(metatype.name)) {
            throw new UnkownModuleException();
        }

        const module = this.modules.get(metatype.name);
        module.addRoute(controller);
    }

    clear() {
        this.modules.clear();
    }

}

export interface InstanceWrapper<T> {
    name: any;
    metatype: Metatype<T>;
    instance: T;
    isResolved: boolean;
    inject?: Metatype<any>[];
    isNotMetatype?: boolean;
}