import 'reflect-metadata';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { Module } from './module';
import { DynamicModule } from '@nestjs/common';
import { ModulesContainer } from './modules-container';
export declare class NestContainer {
    private readonly globalModules;
    private readonly modules;
    private readonly dynamicModulesMetadata;
    private readonly moduleTokenFactory;
    private applicationRef;
    setApplicationRef(applicationRef: any): void;
    getApplicationRef(): any;
    addModule(metatype: Type<any> | DynamicModule, scope: Type<any>[]): void;
    extractMetadata(metatype: Type<any> | DynamicModule): {
        type: Type<any>;
        dynamicMetadata?: Partial<DynamicModule> | undefined;
    };
    isDynamicModule(module: Type<any> | DynamicModule): module is DynamicModule;
    addDynamicMetadata(token: string, dynamicModuleMetadata: Partial<DynamicModule>, scope: Type<any>[]): any;
    addDynamicModules(modules: any[], scope: Type<any>[]): void;
    isGlobalModule(metatype: Type<any>): boolean;
    addGlobalModule(module: Module): void;
    getModules(): ModulesContainer;
    addRelatedModule(relatedModule: Type<any> | DynamicModule, token: string): void;
    addComponent(component: Type<any>, token: string): string;
    addInjectable(injectable: Type<any>, token: string): void;
    addExportedComponent(exportedComponent: Type<any>, token: string): void;
    addController(controller: Type<any>, token: string): void;
    clear(): void;
    replace(toReplace: any, options: any & {
        scope: any[] | null;
    }): void;
    bindGlobalScope(): void;
    bindGlobalsToRelatedModules(module: Module): void;
    bindGlobalModuleToModule(module: Module, globalModule: Module): any;
    getDynamicMetadataByToken(token: string, metadataKey: keyof DynamicModule): any[];
}
export interface InstanceWrapper<T> {
    name: any;
    metatype: Type<T>;
    instance: T;
    isResolved: boolean;
    isPending?: boolean;
    done$?: Promise<void>;
    inject?: Type<any>[];
    isNotMetatype?: boolean;
    forwardRef?: boolean;
    async?: boolean;
}
