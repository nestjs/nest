import 'reflect-metadata';
import { Controller, Injectable } from '@nestjs/common/interfaces';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
import { Module } from './module';
import { DynamicModule } from '@nestjs/common';
import { ModulesContainer } from './modules-container';
export declare class NestContainer {
  private readonly globalModules;
  private readonly modules;
  private readonly dynamicModulesMetadata;
  private readonly moduleTokenFactory;
  addModule(
    metatype: NestModuleMetatype | DynamicModule,
    scope: NestModuleMetatype[]
  ): void;
  extractMetadata(
    metatype: NestModuleMetatype | DynamicModule
  ): {
    type: NestModuleMetatype;
    dynamicMetadata?: Partial<DynamicModule> | undefined;
  };
  isDynamicModule(
    module: NestModuleMetatype | DynamicModule
  ): module is DynamicModule;
  addDynamicMetadata(
    token: string,
    dynamicModuleMetadata: Partial<DynamicModule>
  ): any;
  isGlobalModule(metatype: NestModuleMetatype): boolean;
  addGlobalModule(module: Module): void;
  getModules(): ModulesContainer;
  addRelatedModule(
    relatedModule: NestModuleMetatype | DynamicModule,
    token: string
  ): void;
  addComponent(component: Metatype<Injectable>, token: string): void;
  addInjectable(injectable: Metatype<Injectable>, token: string): void;
  addExportedComponent(
    exportedComponent: Metatype<Injectable>,
    token: string
  ): void;
  addController(controller: Metatype<Controller>, token: string): void;
  clear(): void;
  replace(
    toReplace: any,
    options: any & {
      scope: any[] | null;
    }
  ): void;
  bindGlobalScope(): void;
  bindGlobalsToRelatedModules(module: Module): void;
  bindGlobalModuleToModule(module: Module, globalModule: Module): any;
  getDynamicMetadataByToken(
    token: string,
    metadataKey: keyof DynamicModule
  ): any[];
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
