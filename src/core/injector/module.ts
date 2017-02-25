import { InstanceWrapper } from './container';
import { Injectable, Controller, NestModule } from '../../common/interfaces';
import { UnkownExportException } from '../../errors/exceptions/unkown-export.exception';
import { NestModuleMetatype } from '../../common/interfaces/module-metatype.interface';
import { Metatype } from '../../common/interfaces/metatype.interface';

export class Module {
    private _instance: NestModule;
    private _relatedModules = new Set<Module>();
    private _components = new Map<string, InstanceWrapper<Injectable>>();
    private _routes = new Map<string, InstanceWrapper<Controller>>();
    private _exports = new Set<string>();

    constructor(private _metatype: NestModuleMetatype) {
        this._instance = new _metatype();
    }

    get relatedModules() : Set<Module> {
        return this._relatedModules;
    }

    get components() : Map<string, InstanceWrapper<Injectable>> {
        return this._components;
    }

    get routes() : Map<string, InstanceWrapper<Controller>> {
        return this._routes;
    }

    get exports() : Set<string> {
        return this._exports;
    }

    get instance() : NestModule {
        return this._instance;
    }

    set instance(value: NestModule) {
        this._instance = value;
    }

    get metatype() : NestModuleMetatype {
        return this._metatype;
    }

    addComponent(component: Metatype<Injectable> & { provide?: any, useValue?: any }) {
        if (component.provide && component.useValue) {
            this.addProvider(component);
            return;
        }
        this._components.set(component.name, {
            metatype: component,
            instance: null,
            isResolved: false,
        });
    }

    addProvider(provider) {
        const { provide: type, useValue: value } = provider;
        this._components.set(type.name, {
            metatype: type,
            instance: value,
            isResolved: true,
        });
    }

    addExportedComponent(exportedComponent: Metatype<Injectable>) {
        if (!this._components.get(exportedComponent.name)) {
            throw new UnkownExportException(exportedComponent.name);
        }
        this._exports.add(exportedComponent.name);
    }

    addRoute(route: Metatype<Controller>) {
        this._routes.set(route.name, {
            metatype: route,
            instance: null,
            isResolved: false,
        });
    }

    addRelatedModule(relatedModule) {
        this._relatedModules.add(relatedModule);
    }

}