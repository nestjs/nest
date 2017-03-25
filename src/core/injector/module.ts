import { InstanceWrapper } from './container';
import { Injectable, Controller, NestModule } from '../../common/interfaces';
import { UnkownExportException } from '../../errors/exceptions/unkown-export.exception';
import { NestModuleMetatype } from '../../common/interfaces/module-metatype.interface';
import { Metatype } from '../../common/interfaces/metatype.interface';
import { ModuleRef } from './module-ref';
import { isFunction, isNil } from '../../common/utils/shared.utils';

export type CustomComponent = { provide: any };
export type CustomClass = CustomComponent & { useClass: Metatype<any> };
export type CustomFactory = CustomComponent & { useFactory: Function, inject?: Metatype<any>[] };
export type CustomValue = CustomComponent & { useValue: any };
export type ComponentMetatype = Metatype<Injectable> | CustomFactory | CustomValue | CustomClass;

export class Module {
    private _instance: NestModule;
    private _relatedModules = new Set<Module>();
    private _components = new Map<any, InstanceWrapper<Injectable>>();
    private _routes = new Map<string, InstanceWrapper<Controller>>();
    private _exports = new Set<string>();

    constructor(private _metatype: NestModuleMetatype) {
        this._instance = new _metatype();
        this.addModuleRef();
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

    addModuleRef() {
        const moduleRef = this.getModuleRefMetatype(this._components);
        this._components.set(ModuleRef.name, {
            name: ModuleRef.name,
            metatype: ModuleRef,
            isResolved: true,
            instance: new moduleRef,
        });
    }

    addComponent(component: ComponentMetatype) {
        if (!isNil((<CustomComponent>component).provide)) {
            this.addCustomComponent(component);
            return;
        }
        this._components.set((<Metatype<Injectable>>component).name, {
            name: (<Metatype<Injectable>>component).name,
            metatype: <Metatype<Injectable>>component,
            instance: null,
            isResolved: false,
        });
    }

    addCustomComponent(component: ComponentMetatype) {
        if ((<CustomClass>component).useClass) this.addCustomClass(<CustomClass>component);
        else if((<CustomValue>component).useValue) this.addCustomValue(<CustomValue>component);
        else if((<CustomFactory>component).useFactory) this.addCustomFactory(<CustomFactory>component);
    }

    addCustomClass(component: CustomClass) {
        const { provide: metatype, useClass } = component;
        this._components.set(metatype.name, {
            name: metatype.name,
            metatype: useClass,
            instance: null,
            isResolved: false,
        });
    }

    addCustomValue(component: CustomValue) {
        const { provide, useValue: value } = component;
        const name = isFunction(provide) ? provide.name : provide;

        this._components.set(name, {
            name: name,
            metatype: null,
            instance: value,
            isResolved: true,
            isNotMetatype: true,
        });
    }

    addCustomFactory(component: CustomFactory){
        const { provide: name, useFactory: factory, inject } = component;
        this._components.set(name, {
            name: name,
            metatype: <any>factory,
            instance: null,
            isResolved: false,
            inject: inject || [],
            isNotMetatype: true,
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
            name: (<Metatype<Controller>>route).name,
            metatype: route,
            instance: null,
            isResolved: false,
        });
    }

    addRelatedModule(relatedModule) {
        this._relatedModules.add(relatedModule);
    }

    private getModuleRefMetatype(components) {
        return class extends this._metatype {
            private readonly components = components;

            get<T>(type: string | symbol | object | Metatype<any>): T {
                const name = isFunction(type) ? (<Metatype<any>>type).name : type;
                const exists = this.components.has(name);

                return exists ? <T>this.components.get(name).instance : null;
            }
        }
    }
}