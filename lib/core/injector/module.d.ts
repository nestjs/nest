import { InstanceWrapper, NestContainer } from './container';
import { Injectable, Controller, NestModule } from '@nestjs/common/interfaces';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
export interface CustomComponent {
    provide: any;
    name: string;
}
export declare type OpaqueToken = string | symbol | object | Metatype<any>;
export declare type CustomClass = CustomComponent & {
    useClass: Metatype<any>;
};
export declare type CustomFactory = CustomComponent & {
    useFactory: (...args) => any;
    inject?: Metatype<any>[];
};
export declare type CustomValue = CustomComponent & {
    useValue: any;
};
export declare type ComponentMetatype = Metatype<Injectable> | CustomFactory | CustomValue | CustomClass;
export declare class Module {
    private _metatype;
    private _scope;
    private _relatedModules;
    private _components;
    private _injectables;
    private _routes;
    private _exports;
    constructor(_metatype: NestModuleMetatype, _scope: NestModuleMetatype[], container: NestContainer);
    readonly scope: NestModuleMetatype[];
    readonly relatedModules: Set<Module>;
    readonly components: Map<string, InstanceWrapper<Injectable>>;
    readonly injectables: Map<string, InstanceWrapper<Injectable>>;
    readonly routes: Map<string, InstanceWrapper<Controller>>;
    readonly exports: Set<string>;
    readonly instance: NestModule;
    readonly metatype: NestModuleMetatype;
    addCoreInjectables(container: NestContainer): void;
    addModuleRef(): void;
    addModuleAsComponent(): void;
    addReflector(): void;
    addExternalContextCreator(container: NestContainer): void;
    addModulesContainer(container: NestContainer): void;
    addInjectable(injectable: Metatype<Injectable>): void;
    addComponent(component: ComponentMetatype): void;
    isCustomProvider(component: ComponentMetatype): component is CustomClass | CustomFactory | CustomValue;
    addCustomProvider(component: CustomFactory | CustomValue | CustomClass, collection: Map<string, any>): void;
    isCustomClass(component: any): component is CustomClass;
    isCustomValue(component: any): component is CustomValue;
    isCustomFactory(component: any): component is CustomFactory;
    addCustomClass(component: CustomClass, collection: Map<string, any>): void;
    addCustomValue(component: CustomValue, collection: Map<string, any>): void;
    addCustomFactory(component: CustomFactory, collection: Map<string, any>): void;
    addExportedComponent(exportedComponent: ComponentMetatype): void;
    addCustomExportedComponent(exportedComponent: CustomFactory | CustomValue | CustomClass): void;
    addRoute(route: Metatype<Controller>): void;
    addRelatedModule(relatedModule: any): void;
    replace(toReplace: any, options: any): void;
    createModuleRefMetatype(components: any): {
        new (): {
            readonly components: any;
            get<T>(type: OpaqueToken): T;
        };
    };
}
