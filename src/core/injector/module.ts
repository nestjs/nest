import { InstanceWrapper } from './container';
import { Injectable, Controller, NestModule } from '../../common/interfaces';
import { UnknownExportException } from '../../errors/exceptions/unknown-export.exception';
import { NestModuleMetatype } from '../../common/interfaces/module-metatype.interface';
import { Metatype } from '../../common/interfaces/metatype.interface';
import { ModuleRef } from './module-ref';
import { isFunction, isNil, isUndefined } from '../../common/utils/shared.utils';
import { RuntimeException } from '../../errors/exceptions/runtime.exception';

export interface CustomComponent {
    provide: any;
    name: string;
}
export type OpaqueToken = string | symbol | object | Metatype<any>;
export type CustomClass = CustomComponent & { useClass: Metatype<any> };
export type CustomFactory = CustomComponent & { useFactory: (...args) => any, inject?: Metatype<any>[] };
export type CustomValue = CustomComponent & { useValue: any };
export type ComponentMetatype = Metatype<Injectable> | CustomFactory | CustomValue | CustomClass;

export class Module {
    private _relatedModules = new Set<Module>();
    private _components = new Map<any, InstanceWrapper<Injectable>>();
    private _routes = new Map<string, InstanceWrapper<Controller>>();
    private _exports = new Set<string>();

    constructor(private _metatype: NestModuleMetatype) {
        this.addModuleRef();
        this.addModuleAsComponent();
    }

    get relatedModules(): Set<Module> {
        return this._relatedModules;
    }

    get components(): Map<string, InstanceWrapper<Injectable>> {
        return this._components;
    }

    get routes(): Map<string, InstanceWrapper<Controller>> {
        return this._routes;
    }

    get exports(): Set<string> {
        return this._exports;
    }

    get instance(): NestModule {
        if (!this._components.has(this._metatype.name)) {
            throw new RuntimeException();
        }
        const module = this._components.get(this._metatype.name);
        return module.instance;
    }

    get metatype(): NestModuleMetatype {
        return this._metatype;
    }

    public addModuleRef() {
        const moduleRef = this.getModuleRefMetatype(this._components);
        this._components.set(ModuleRef.name, {
            name: ModuleRef.name,
            metatype: ModuleRef as any,
            isResolved: true,
            instance: new moduleRef(),
        });
    }

    public addModuleAsComponent() {
        this._components.set(this._metatype.name, {
            name: this._metatype.name,
            metatype: this._metatype,
            isResolved: false,
            instance: null,
        });
    }

    public addComponent(component: ComponentMetatype) {
        if (this.isCustomComponent(component)) {
            this.addCustomComponent(component);
            return;
        }
        this._components.set((component as Metatype<Injectable>).name, {
            name: (component as Metatype<Injectable>).name,
            metatype: component as Metatype<Injectable>,
            instance: null,
            isResolved: false,
        });
    }

    public isCustomComponent(component: ComponentMetatype): component is CustomClass | CustomFactory | CustomValue  {
        return !isNil((component as CustomComponent).provide);
    }

    public addCustomComponent(component: CustomFactory | CustomValue | CustomClass) {
        const { provide } = component;
        const name = isFunction(provide) ? provide.name : provide;
        const comp = {
            ...component,
            name,
        };

        if (this.isCustomClass(comp)) this.addCustomClass(comp);
        else if (this.isCustomValue(comp)) this.addCustomValue(comp);
        else if (this.isCustomFactory(comp)) this.addCustomFactory(comp);
    }

    public isCustomClass(component): component is CustomClass {
        return !isUndefined((component as CustomClass).useClass);
    }

    public isCustomValue(component): component is CustomValue {
        return !isUndefined((component as CustomValue).useValue);
    }

    public isCustomFactory(component): component is CustomFactory {
        return !isUndefined((component as CustomFactory).useFactory);
    }

    public addCustomClass(component: CustomClass) {
        const { provide, name, useClass } = component;
        this._components.set(name, {
            name,
            metatype: useClass,
            instance: null,
            isResolved: false,
        });
    }

    public addCustomValue(component: CustomValue) {
        const { provide, name, useValue: value } = component;
        this._components.set(name, {
            name,
            metatype: null,
            instance: value,
            isResolved: true,
            isNotMetatype: true,
        });
    }

    public addCustomFactory(component: CustomFactory){
        const { provide, name, useFactory: factory, inject } = component;
        this._components.set(name, {
            name,
            metatype: factory as any,
            instance: null,
            isResolved: false,
            inject: inject || [],
            isNotMetatype: true,
        });
    }

    public addExportedComponent(exportedComponent: Metatype<Injectable>) {
        if (!this._components.get(exportedComponent.name)) {
            throw new UnknownExportException(exportedComponent.name);
        }
        this._exports.add(exportedComponent.name);
    }

    public addRoute(route: Metatype<Controller>) {
        this._routes.set(route.name, {
            name: route.name,
            metatype: route,
            instance: null,
            isResolved: false,
        });
    }

    public addRelatedModule(relatedModule) {
        this._relatedModules.add(relatedModule);
    }

    private getModuleRefMetatype(components) {
        return class {
            private readonly components = components;

            public get<T>(type: OpaqueToken): T {
                const name = isFunction(type) ? (type as Metatype<any>).name : type;
                const exists = this.components.has(name);

                return exists ? this.components.get(name).instance as T : null;
            }
        }
    }
}