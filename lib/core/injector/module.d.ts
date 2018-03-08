import { InstanceWrapper, NestContainer } from './container';
import { Injectable, Controller, NestModule, DynamicModule } from '@nestjs/common/interfaces';
import { Type } from '@nestjs/common/interfaces/type.interface';
export interface CustomComponent {
    provide: any;
    name: string;
}
export declare type OpaqueToken = string | symbol | object | Type<any>;
export declare type CustomClass = CustomComponent & {
    useClass: Type<any>;
};
export declare type CustomFactory = CustomComponent & {
    useFactory: (...args) => any;
    inject?: OpaqueToken[];
};
export declare type CustomValue = CustomComponent & {
    useValue: any;
};
export declare type ComponentMetatype = Type<Injectable> | CustomFactory | CustomValue | CustomClass;
export declare class Module {
    private readonly _metatype;
    private readonly _scope;
    private _relatedModules;
    private _components;
    private _injectables;
    private _routes;
    private _exports;
    constructor(_metatype: Type<any>, _scope: Type<any>[], container: NestContainer);
    readonly scope: Type<any>[];
    readonly relatedModules: Set<Module>;
    readonly components: Map<string, InstanceWrapper<Injectable>>;
    readonly injectables: Map<string, InstanceWrapper<Injectable>>;
    readonly routes: Map<string, InstanceWrapper<Controller>>;
    readonly exports: Set<string>;
    readonly instance: NestModule;
    readonly metatype: Type<any>;
    addCoreInjectables(container: NestContainer): void;
    addModuleRef(): void;
    addModuleAsComponent(): void;
    addReflector(): void;
    addApplicationRef(applicationRef: any): void;
    addExternalContextCreator(container: NestContainer): void;
    addModulesContainer(container: NestContainer): void;
    addInjectable(injectable: Type<Injectable>): string;
    addComponent(component: ComponentMetatype): string;
    isCustomProvider(component: ComponentMetatype): component is CustomClass | CustomFactory | CustomValue;
    addCustomProvider(component: CustomFactory | CustomValue | CustomClass, collection: Map<string, any>): string;
    isCustomClass(component: any): component is CustomClass;
    isCustomValue(component: any): component is CustomValue;
    isCustomFactory(component: any): component is CustomFactory;
    isDynamicModule(exported: any): exported is DynamicModule;
    addCustomClass(component: CustomClass, collection: Map<string, any>): void;
    addCustomValue(component: CustomValue, collection: Map<string, any>): void;
    addCustomFactory(component: CustomFactory, collection: Map<string, any>): void;
    addExportedComponent(exportedComponent: ComponentMetatype | string | DynamicModule): Set<string>;
    addCustomExportedComponent(exportedComponent: CustomFactory | CustomValue | CustomClass): Set<string>;
    addRoute(route: Type<Controller>): void;
    addRelatedModule(relatedModule: any): void;
    replace(toReplace: any, options: any): string;
    createModuleRefMetatype(components: any): {
        new (): {
            readonly components: any;
            get<T>(type: any): T;
        };
    };
}
