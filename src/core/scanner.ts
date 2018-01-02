import 'reflect-metadata';
import { NestContainer } from './injector/container';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import {
  metadata,
  GATEWAY_MIDDLEWARES,
  EXCEPTION_FILTERS_METADATA,
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
} from '@nestjs/common/constants';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
import { MetadataScanner } from '../core/metadata-scanner';
import { DynamicModule } from '@nestjs/common';

export class DependenciesScanner {
  constructor(
    private readonly container: NestContainer,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  public scan(module: NestModuleMetatype) {
    this.scanForModules(module);
    this.scanModulesForDependencies();
    this.container.bindGlobalScope();
  }

  public scanForModules(
    module: NestModuleMetatype | DynamicModule,
    scope: NestModuleMetatype[] = [],
  ) {
    this.storeModule(module, scope);

    const importedModules = this.reflectMetadata(module, metadata.MODULES);
    importedModules.map(innerModule => {
      this.scanForModules(innerModule, [].concat(scope, module));
    });
  }

  public storeModule(module: any, scope: NestModuleMetatype[]) {
    if (module && module.forwardRef) {
      return this.container.addModule(module.forwardRef(), scope);
    }
    this.container.addModule(module, scope);
  }

  public scanModulesForDependencies() {
    const modules = this.container.getModules();

    modules.forEach(({ metatype }, token) => {
      this.reflectRelatedModules(metatype, token);
      this.reflectComponents(metatype, token);
      this.reflectControllers(metatype, token);
      this.reflectExports(metatype, token);
    });
  }

  public reflectRelatedModules(module: NestModuleMetatype, token: string) {
    const modules = [
      ...this.reflectMetadata(module, metadata.MODULES),
      ...this.container.getDynamicMetadataByToken(
        token,
        metadata.MODULES as 'modules',
      ),
      ...this.container.getDynamicMetadataByToken(
        token,
        metadata.IMPORTS as 'imports',
      ),
    ];
    modules.map(related => this.storeRelatedModule(related, token));
  }

  public reflectComponents(module: NestModuleMetatype, token: string) {
    const components = [
      ...this.reflectMetadata(module, metadata.COMPONENTS),
      ...this.container.getDynamicMetadataByToken(
        token,
        metadata.COMPONENTS as 'components',
      ),
    ];
    components.map(component => {
      this.storeComponent(component, token);
      this.reflectComponentMetadata(component, token);
      this.reflectDynamicMetadata(component, token);
    });
  }

  public reflectComponentMetadata(
    component: Metatype<Injectable>,
    token: string,
  ) {
    this.reflectGatewaysMiddlewares(component, token);
  }

  public reflectControllers(module: NestModuleMetatype, token: string) {
    const routes = [
      ...this.reflectMetadata(module, metadata.CONTROLLERS),
      ...this.container.getDynamicMetadataByToken(
        token,
        metadata.CONTROLLERS as 'controllers',
      ),
    ];
    routes.map(route => {
      this.storeRoute(route, token);
      this.reflectDynamicMetadata(route, token);
    });
  }

  public reflectDynamicMetadata(obj: Metatype<Injectable>, token: string) {
    if (!obj.prototype) {
      return;
    }

    this.reflectGuards(obj, token);
    this.reflectInterceptors(obj, token);
  }

  public reflectExports(module: NestModuleMetatype, token: string) {
    const exports = [
      ...this.reflectMetadata(module, metadata.EXPORTS),
      ...this.container.getDynamicMetadataByToken(
        token,
        metadata.EXPORTS as 'exports',
      ),
    ];
    exports.map(exportedComponent =>
      this.storeExportedComponent(exportedComponent, token),
    );
  }

  public reflectGatewaysMiddlewares(
    component: Metatype<Injectable>,
    token: string,
  ) {
    const middlewares = this.reflectMetadata(component, GATEWAY_MIDDLEWARES);
    middlewares.map(middleware => this.storeComponent(middleware, token));
  }

  public reflectGuards(component: Metatype<Injectable>, token: string) {
    const controllerGuards = this.reflectMetadata(component, GUARDS_METADATA);
    const methodsGuards = this.metadataScanner.scanFromPrototype(
      null,
      component.prototype,
      this.reflectKeyMetadata.bind(this, component, GUARDS_METADATA),
    );
    const flattenMethodsGuards = methodsGuards.reduce<any[]>(
      (a: any[], b) => a.concat(b),
      [],
    );
    [...controllerGuards, ...flattenMethodsGuards].map(guard =>
      this.storeInjectable(guard, token),
    );
  }

  public reflectInterceptors(component: Metatype<Injectable>, token: string) {
    const controllerInterceptors = this.reflectMetadata(
      component,
      INTERCEPTORS_METADATA,
    );
    const methodsInterceptors = this.metadataScanner.scanFromPrototype(
      null,
      component.prototype,
      this.reflectKeyMetadata.bind(this, component, INTERCEPTORS_METADATA),
    );
    const flattenMethodsInterceptors = methodsInterceptors.reduce<any[]>(
      (a: any[], b) => a.concat(b),
      [],
    );
    [...controllerInterceptors, ...flattenMethodsInterceptors].map(guard =>
      this.storeInjectable(guard, token),
    );
  }

  public reflectKeyMetadata(
    component: Metatype<Injectable>,
    key: string,
    method: string,
  ) {
    const descriptor = Reflect.getOwnPropertyDescriptor(
      component.prototype,
      method,
    );
    return descriptor ? Reflect.getMetadata(key, descriptor.value) : undefined;
  }

  public storeRelatedModule(related: any, token: string) {
    if (related.forwardRef) {
      return this.container.addRelatedModule(related.forwardRef(), token);
    }
    this.container.addRelatedModule(related, token);
  }

  public storeComponent(component: Metatype<Injectable>, token: string) {
    this.container.addComponent(component, token);
  }

  public storeInjectable(component: Metatype<Injectable>, token: string) {
    this.container.addInjectable(component, token);
  }

  public storeExportedComponent(
    exportedComponent: Metatype<Injectable>,
    token: string,
  ) {
    this.container.addExportedComponent(exportedComponent, token);
  }

  public storeRoute(route: Metatype<Controller>, token: string) {
    this.container.addController(route, token);
  }

  public reflectMetadata(metatype, metadata: string) {
    return Reflect.getMetadata(metadata, metatype) || [];
  }
}
