import { Controller, Injectable } from '../../common/interfaces/';
import { Module } from './module';
import { UnknownModuleException } from '../../errors/exceptions/unknown-module.exception';
import { NestModuleMetatype } from '../../common/interfaces/module-metatype.interface';
import { Metatype } from '../../common/interfaces/metatype.interface';

export class NestContainer {
    private readonly modules = new Map<string, Module>();

    public addModule(metatype: NestModuleMetatype) {
        if (this.modules.has(metatype.name)) return;

        this.modules.set(metatype.name, new Module(metatype));
    }

    public getModules(): Map<string, Module> {
        return this.modules;
    }

    public addRelatedModule(relatedModule: NestModuleMetatype, target: NestModuleMetatype) {
        if (!this.modules.has(target.name)) return;

        const module = this.modules.get(target.name);
        const related = this.modules.get(relatedModule.name);

        module.addRelatedModule(related);
    }

    public addComponent(component: Metatype<Injectable>, metatype: NestModuleMetatype) {
        if (!this.modules.has(metatype.name)) {
            throw new UnknownModuleException();
        }
        const module = this.modules.get(metatype.name);
        module.addComponent(component);
    }

    public addExportedComponent(exportedComponent: Metatype<Injectable>, metatype: NestModuleMetatype) {
        if (!this.modules.has(metatype.name)) {
            throw new UnknownModuleException();
        }
        const module = this.modules.get(metatype.name);
        module.addExportedComponent(exportedComponent);
    }

    public addController(controller: Metatype<Controller>, metatype: NestModuleMetatype) {
        if (!this.modules.has(metatype.name)) {
            throw new UnknownModuleException();
        }
        const module = this.modules.get(metatype.name);
        module.addRoute(controller);
    }

    public clear() {
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