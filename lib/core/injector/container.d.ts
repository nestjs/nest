import 'reflect-metadata';
import { Controller, Injectable } from '@nestjs/common/interfaces';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
import { Module } from './module';
export declare class NestContainer {
    private readonly modules;
    private readonly moduleTokenFactory;
    addModule(metatype: NestModuleMetatype, scope: NestModuleMetatype[]): void;
    getModules(): Map<string, Module>;
    addRelatedModule(relatedModule: NestModuleMetatype, token: string): void;
    addComponent(component: Metatype<Injectable>, token: string): void;
    addInjectable(injectable: Metatype<Injectable>, token: string): void;
    addExportedComponent(exportedComponent: Metatype<Injectable>, token: string): void;
    addController(controller: Metatype<Controller>, token: string): void;
    clear(): void;
    replace(toReplace: any, options: any & {
        scope: any[] | null;
    }): void;
}
export interface InstanceWrapper<T> {
    name: any;
    metatype: Metatype<T>;
    instance: T;
    isResolved: boolean;
    isPending?: boolean;
    done$?: Promise<void>;
    inject?: Metatype<any>[];
    isNotMetatype?: boolean;
    forwardRef?: boolean;
    async?: boolean;
}
