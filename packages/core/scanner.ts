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
  PIPES_METADATA,
} from '@nestjs/common/constants';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { MetadataScanner } from '../core/metadata-scanner';
import { DynamicModule } from '@nestjs/common';
import { ApplicationConfig } from './application-config';
import {
  isNil,
  isUndefined,
  isFunction,
} from '@nestjs/common/utils/shared.utils';
import { APP_INTERCEPTOR, APP_PIPE, APP_GUARD, APP_FILTER } from './constants';
import { CircularDependencyException } from './errors/exceptions/circular-dependency.exception';

interface ApplicationProviderWrapper {
  moduleToken: string;
  providerToken: string;
}

export class DependenciesScanner {
  private readonly applicationProvidersApplyMap: ApplicationProviderWrapper[] = [];
  constructor(
    private readonly container: NestContainer,
    private readonly metadataScanner: MetadataScanner,
    private readonly applicationConfig = new ApplicationConfig(),
  ) {}

  public scan(module: Type<any>) {
    this.scanForModules(module);
    this.scanModulesForDependencies();
    this.container.bindGlobalScope();
  }

  public scanForModules(
    module: Type<any> | DynamicModule,
    scope: Type<any>[] = [],
  ) {
    this.storeModule(module, scope);

    const importedModules = this.reflectMetadata(module, metadata.MODULES);
    importedModules.map(innerModule => {
      this.scanForModules(innerModule, [].concat(scope, module));
    });
  }

  public storeModule(module: any, scope: Type<any>[]) {
    if (module && module.forwardRef) {
      return this.container.addModule(module.forwardRef(), scope);
    }
    this.container.addModule(module, scope);
  }

  public scanModulesForDependencies() {
    const modules = this.container.getModules();

    modules.forEach(({ metatype }, token) => {
      this.reflectRelatedModules(metatype, token, metatype.name);
      this.reflectComponents(metatype, token);
      this.reflectControllers(metatype, token);
      this.reflectExports(metatype, token);
    });
  }

  public reflectRelatedModules(
    module: Type<any>,
    token: string,
    context: string,
  ) {
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
    modules.map(related => this.storeRelatedModule(related, token, context));
  }

  public reflectComponents(module: Type<any>, token: string) {
    const components = [
      ...this.reflectMetadata(module, metadata.COMPONENTS),
      ...this.container.getDynamicMetadataByToken(
        token,
        metadata.COMPONENTS as 'components',
      ),
      ...this.container.getDynamicMetadataByToken(
        token,
        metadata.PROVIDERS as 'providers',
      ),
    ];
    components.map(component => {
      this.storeComponent(component, token);
      this.reflectComponentMetadata(component, token);
      this.reflectDynamicMetadata(component, token);
    });
  }

  public reflectComponentMetadata(component: Type<Injectable>, token: string) {
    this.reflectGatewaysMiddlewares(component, token);
  }

  public reflectControllers(module: Type<any>, token: string) {
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

  public reflectDynamicMetadata(obj: Type<Injectable>, token: string) {
    if (!obj || !obj.prototype) {
      return;
    }
    this.reflectInjectables(obj, token, GUARDS_METADATA);
    this.reflectInjectables(obj, token, INTERCEPTORS_METADATA);
    this.reflectInjectables(obj, token, EXCEPTION_FILTERS_METADATA);
    this.reflectInjectables(obj, token, PIPES_METADATA);
  }

  public reflectExports(module: Type<any>, token: string) {
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
    component: Type<Injectable>,
    token: string,
  ) {
    const middlewares = this.reflectMetadata(component, GATEWAY_MIDDLEWARES);
    middlewares.map(middleware => this.storeComponent(middleware, token));
  }

  public reflectInjectables(
    component: Type<Injectable>,
    token: string,
    metadataKey: string,
  ) {
    const controllerInjectables = this.reflectMetadata(component, metadataKey);
    const methodsInjectables = this.metadataScanner.scanFromPrototype(
      null,
      component.prototype,
      this.reflectKeyMetadata.bind(this, component, metadataKey),
    );
    const flattenMethodsInjectables = methodsInjectables.reduce<any[]>(
      (a: any[], b) => a.concat(b),
      [],
    );
    const mergedInjectableConstructors = [
      ...controllerInjectables,
      ...flattenMethodsInjectables,
    ].filter(isFunction);

    mergedInjectableConstructors.map(injectable =>
      this.storeInjectable(injectable, token),
    );
  }

  public reflectKeyMetadata(
    component: Type<Injectable>,
    key: string,
    method: string,
  ) {
    const descriptor = Reflect.getOwnPropertyDescriptor(
      component.prototype,
      method,
    );
    return descriptor ? Reflect.getMetadata(key, descriptor.value) : undefined;
  }

  public storeRelatedModule(related: any, token: string, context: string) {
    if (isUndefined(related)) {
      throw new CircularDependencyException(context);
    }
    if (related && related.forwardRef) {
      return this.container.addRelatedModule(related.forwardRef(), token);
    }
    this.container.addRelatedModule(related, token);
  }

  public storeComponent(component, token: string) {
    const isCustomProvider = component && !isNil(component.provide);
    if (!isCustomProvider) {
      return this.container.addComponent(component, token);
    }
    const applyProvidersMap = this.getApplyProvidersMap();
    const providersKeys = Object.keys(applyProvidersMap);
    const providerToken = component.provide;
    if (providersKeys.indexOf(providerToken) < 0) {
      return this.container.addComponent(component, token);
    }
    this.applicationProvidersApplyMap.push({
      moduleToken: token,
      providerToken,
    });
    this.container.addComponent(component, token);
  }

  public storeInjectable(component: Type<Injectable>, token: string) {
    this.container.addInjectable(component, token);
  }

  public storeExportedComponent(
    exportedComponent: Type<Injectable>,
    token: string,
  ) {
    this.container.addExportedComponent(exportedComponent, token);
  }

  public storeRoute(route: Type<Controller>, token: string) {
    this.container.addController(route, token);
  }

  public reflectMetadata(metatype, metadata: string) {
    return Reflect.getMetadata(metadata, metatype) || [];
  }

  public applyApplicationProviders() {
    const applyProvidersMap = this.getApplyProvidersMap();
    this.applicationProvidersApplyMap.forEach(
      ({ moduleToken, providerToken }) => {
        const modules = this.container.getModules();
        const { components } = modules.get(moduleToken);
        const { instance } = components.get(providerToken);

        applyProvidersMap[providerToken](instance);
      },
    );
  }

  public getApplyProvidersMap(): { [type: string]: Function } {
    return {
      [APP_INTERCEPTOR]: interceptor =>
        this.applicationConfig.addGlobalInterceptor(interceptor),
      [APP_PIPE]: pipe => this.applicationConfig.addGlobalPipe(pipe),
      [APP_GUARD]: guard => this.applicationConfig.addGlobalGuard(guard),
      [APP_FILTER]: filter => this.applicationConfig.addGlobalFilter(filter),
    };
  }
}
