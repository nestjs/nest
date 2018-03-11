import 'reflect-metadata';
import { NestContainer } from './injector/container';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
import { MetadataScanner } from '../core/metadata-scanner';
import { DynamicModule } from '@nestjs/common';
import { ApplicationConfig } from './application-config';
export declare class DependenciesScanner {
  private readonly container;
  private readonly metadataScanner;
  private readonly applicationConfig;
  private readonly applicationProvidersApplyMap;
  constructor(
    container: NestContainer,
    metadataScanner: MetadataScanner,
    applicationConfig?: ApplicationConfig,
  );
  scan(module: NestModuleMetatype): void;
  scanForModules(
    module: NestModuleMetatype | DynamicModule,
    scope?: NestModuleMetatype[],
  ): void;
  storeModule(module: any, scope: NestModuleMetatype[]): void;
  scanModulesForDependencies(): void;
  reflectRelatedModules(module: NestModuleMetatype, token: string): void;
  reflectComponents(module: NestModuleMetatype, token: string): void;
  reflectComponentMetadata(
    component: Metatype<Injectable>,
    token: string,
  ): void;
  reflectControllers(module: NestModuleMetatype, token: string): void;
  reflectDynamicMetadata(obj: Metatype<Injectable>, token: string): void;
  reflectExports(module: NestModuleMetatype, token: string): void;
  reflectGatewaysMiddlewares(
    component: Metatype<Injectable>,
    token: string,
  ): void;
  reflectGuards(component: Metatype<Injectable>, token: string): void;
  reflectInterceptors(component: Metatype<Injectable>, token: string): void;
  reflectKeyMetadata(
    component: Metatype<Injectable>,
    key: string,
    method: string,
  ): any;
  storeRelatedModule(related: any, token: string): void;
  storeComponent(component: any, token: string): string;
  storeInjectable(component: Metatype<Injectable>, token: string): void;
  storeExportedComponent(
    exportedComponent: Metatype<Injectable>,
    token: string,
  ): void;
  storeRoute(route: Metatype<Controller>, token: string): void;
  reflectMetadata(metatype: any, metadata: string): any;
  applyApplicationProviders(): void;
  getApplyProvidersMap(): {
    [type: string]: Function;
  };
}
