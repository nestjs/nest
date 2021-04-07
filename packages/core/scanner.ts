import {
  Abstract,
  DynamicModule,
  flatten,
  ForwardReference,
  Provider,
} from '@nestjs/common';
import {
  EXCEPTION_FILTERS_METADATA,
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
  MODULE_METADATA,
  PIPES_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';
import {
  CanActivate,
  ClassProvider,
  ExceptionFilter,
  ExistingProvider,
  FactoryProvider,
  NestInterceptor,
  PipeTransform,
  Scope,
  ValueProvider,
} from '@nestjs/common/interfaces';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import {
  isFunction,
  isNil,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';

import { CircularDependencyException } from './errors/exceptions/circular-dependency.exception';
import { InvalidModuleException } from './errors/exceptions/invalid-module.exception';
import { UndefinedModuleException } from './errors/exceptions/undefined-module.exception';
import { getClassScope } from './helpers/get-class-scope';
import { NestContainer } from './injector/container';
import { InstanceWrapper } from './injector/instance-wrapper';
import { Module } from './injector/module';
import { ApplicationConfig } from './application-config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from './constants';
import { ModulesContainer } from './injector';
import { MetadataScanner } from './metadata-scanner';

interface ApplicationProviderWrapper {
  moduleKey: string;
  providerKey: string;
  type: string | symbol | Type<any> | Abstract<any> | Function;
  scope?: Scope;
}

export class DependenciesScanner {
  private readonly applicationProvidersApplyMap: ApplicationProviderWrapper[] = [];

  constructor(
    private readonly container: NestContainer,
    private readonly metadataScanner: MetadataScanner,
    private readonly applicationConfig = new ApplicationConfig(),
  ) {}

  public async scan(module: Type<any>) {
    await this.registerCoreModule();
    await this.scanForModules(module);
    await this.scanModulesForDependencies();

    this.addScopedEnhancersMetadata();
    this.container.bindGlobalScope();
  }

  public async scanForModules(
    moduleDefinition:
      | ForwardReference
      | Type<unknown>
      | DynamicModule
      | Promise<DynamicModule>,
    scope: Type<unknown>[] = [],
    ctxRegistry: (ForwardReference | DynamicModule | Type<unknown>)[] = [],
  ): Promise<Module> {
    const moduleInstance = await this.insertModule(moduleDefinition, scope);
    moduleDefinition =
      moduleDefinition instanceof Promise
        ? await moduleDefinition
        : moduleDefinition;
    ctxRegistry.push(moduleDefinition);

    if (this.isForwardReference(moduleDefinition)) {
      moduleDefinition = (moduleDefinition as ForwardReference).forwardRef();
    }
    const modules = !this.isDynamicModule(
      moduleDefinition as Type<any> | DynamicModule,
    )
      ? this.reflectMetadata(
          moduleDefinition as Type<any>,
          MODULE_METADATA.IMPORTS,
        )
      : [
          ...this.reflectMetadata(
            (moduleDefinition as DynamicModule).module,
            MODULE_METADATA.IMPORTS,
          ),
          ...((moduleDefinition as DynamicModule).imports || []),
        ];

    for (const [index, innerModule] of modules.entries()) {
      // In case of a circular dependency (ES module system), JavaScript will resolve the type to `undefined`.
      if (innerModule === undefined) {
        throw new UndefinedModuleException(moduleDefinition, index, scope);
      }
      if (!innerModule) {
        throw new InvalidModuleException(moduleDefinition, index, scope);
      }
      if (ctxRegistry.includes(innerModule)) {
        continue;
      }
      await this.scanForModules(
        innerModule,
        [].concat(scope, moduleDefinition),
        ctxRegistry,
      );
    }
    return moduleInstance;
  }

  public async insertModule(
    module: any,
    scope: Type<unknown>[],
  ): Promise<Module> {
    if (module && module.forwardRef) {
      return this.container.addModule(module.forwardRef(), scope);
    }
    return this.container.addModule(module, scope);
  }

  public async scanModulesForDependencies() {
    const modules = this.container.getModules();

    for (const [token, { metatype }] of modules) {
      await this.reflectImports(metatype, token, metatype.name);
      this.reflectProviders(metatype, token);
      this.reflectControllers(metatype, token);
      this.reflectExports(metatype, token);
    }
    this.calculateModulesDistance(modules);
  }

  public async reflectImports(
    module: Type<unknown>,
    token: string,
    context: string,
  ) {
    const modules = [
      ...this.reflectMetadata(module, MODULE_METADATA.IMPORTS),
      ...this.container.getDynamicMetadataByToken(
        token,
        MODULE_METADATA.IMPORTS as 'imports',
      ),
    ];
    for (const related of modules) {
      await this.insertImport(related, token, context);
    }
  }

  public reflectProviders(module: Type<any>, token: string) {
    const providers = [
      ...this.reflectMetadata(module, MODULE_METADATA.PROVIDERS),
      ...this.container.getDynamicMetadataByToken(
        token,
        MODULE_METADATA.PROVIDERS as 'providers',
      ),
    ];
    providers.forEach(provider => {
      this.insertProvider(provider, token);
      this.reflectDynamicMetadata(provider, token);
    });
  }

  public reflectControllers(module: Type<any>, token: string) {
    const controllers = [
      ...this.reflectMetadata(module, MODULE_METADATA.CONTROLLERS),
      ...this.container.getDynamicMetadataByToken(
        token,
        MODULE_METADATA.CONTROLLERS as 'controllers',
      ),
    ];
    controllers.forEach(item => {
      this.insertController(item, token);
      this.reflectDynamicMetadata(item, token);
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
    this.reflectParamInjectables(obj, token, ROUTE_ARGS_METADATA);
  }

  public reflectExports(module: Type<unknown>, token: string) {
    const exports = [
      ...this.reflectMetadata(module, MODULE_METADATA.EXPORTS),
      ...this.container.getDynamicMetadataByToken(
        token,
        MODULE_METADATA.EXPORTS as 'exports',
      ),
    ];
    exports.forEach(exportedProvider =>
      this.insertExportedProvider(exportedProvider, token),
    );
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

    const flattenMethodsInjectables = this.flatten(methodsInjectables);
    const combinedInjectables = [
      ...controllerInjectables,
      ...flattenMethodsInjectables,
    ].filter(isFunction);
    const injectables = Array.from(new Set(combinedInjectables));

    injectables.forEach(injectable =>
      this.insertInjectable(injectable, token, component),
    );
  }

  public reflectParamInjectables(
    component: Type<Injectable>,
    token: string,
    metadataKey: string,
  ) {
    const paramsMetadata = this.metadataScanner.scanFromPrototype(
      null,
      component.prototype,
      method => Reflect.getMetadata(metadataKey, component, method),
    );
    const paramsInjectables = this.flatten(
      paramsMetadata,
    ).map((param: Record<string, any>) =>
      flatten(Object.keys(param).map(k => param[k].pipes)).filter(isFunction),
    );
    flatten(paramsInjectables).forEach((injectable: Type<Injectable>) =>
      this.insertInjectable(injectable, token, component),
    );
  }

  public reflectKeyMetadata(
    component: Type<Injectable>,
    key: string,
    method: string,
  ) {
    let prototype = component.prototype;
    do {
      const descriptor = Reflect.getOwnPropertyDescriptor(prototype, method);
      if (!descriptor) {
        continue;
      }
      return Reflect.getMetadata(key, descriptor.value);
    } while (
      (prototype = Reflect.getPrototypeOf(prototype)) &&
      prototype !== Object.prototype &&
      prototype
    );
    return undefined;
  }

  public async calculateModulesDistance(modules: ModulesContainer) {
    const modulesGenerator = modules.values();
    const rootModule = modulesGenerator.next().value as Module;
    const modulesStack = [rootModule];

    const calculateDistance = (moduleRef: Module, distance = 1) => {
      if (modulesStack.includes(moduleRef)) {
        return;
      }
      modulesStack.push(moduleRef);

      const moduleImports = rootModule.relatedModules;
      moduleImports.forEach(module => {
        module.distance = distance;
        calculateDistance(module, distance + 1);
      });
    };
    calculateDistance(rootModule);
  }

  public async insertImport(related: any, token: string, context: string) {
    if (isUndefined(related)) {
      throw new CircularDependencyException(context);
    }
    if (related && related.forwardRef) {
      return this.container.addImport(related.forwardRef(), token);
    }
    await this.container.addImport(related, token);
  }

  public isCustomProvider(
    provider: Provider,
  ): provider is
    | ClassProvider
    | ValueProvider
    | FactoryProvider
    | ExistingProvider {
    return provider && !isNil((provider as any).provide);
  }

  public insertProvider(provider: Provider, token: string) {
    const isCustomProvider = this.isCustomProvider(provider);
    if (!isCustomProvider) {
      return this.container.addProvider(provider as Type<any>, token);
    }
    const applyProvidersMap = this.getApplyProvidersMap();
    const providersKeys = Object.keys(applyProvidersMap);
    const type = (provider as
      | ClassProvider
      | ValueProvider
      | FactoryProvider
      | ExistingProvider).provide;

    if (!providersKeys.includes(type as string)) {
      return this.container.addProvider(provider as any, token);
    }
    const providerToken = `${
      type as string
    } (UUID: ${randomStringGenerator()})`;

    let scope = (provider as ClassProvider | FactoryProvider).scope;
    if (isNil(scope) && (provider as ClassProvider).useClass) {
      scope = getClassScope((provider as ClassProvider).useClass);
    }
    this.applicationProvidersApplyMap.push({
      type,
      moduleKey: token,
      providerKey: providerToken,
      scope,
    });

    const newProvider = {
      ...provider,
      provide: providerToken,
      scope,
    } as Provider;

    if (
      this.isRequestOrTransient(
        (newProvider as FactoryProvider | ClassProvider).scope,
      )
    ) {
      return this.container.addInjectable(newProvider, token);
    }
    this.container.addProvider(newProvider, token);
  }

  public insertInjectable(
    injectable: Type<Injectable>,
    token: string,
    host: Type<Injectable>,
  ) {
    this.container.addInjectable(injectable, token, host);
  }

  public insertExportedProvider(
    exportedProvider: Type<Injectable>,
    token: string,
  ) {
    this.container.addExportedProvider(exportedProvider, token);
  }

  public insertController(controller: Type<Controller>, token: string) {
    this.container.addController(controller, token);
  }

  public reflectMetadata(metatype: Type<any>, metadataKey: string) {
    return Reflect.getMetadata(metadataKey, metatype) || [];
  }

  public async registerCoreModule() {
    const module = this.container.createCoreModule();
    const instance = await this.scanForModules(module);
    this.container.registerCoreModuleRef(instance);
  }

  /**
   * Add either request or transient globally scoped enhancers
   * to all controllers metadata storage
   */
  public addScopedEnhancersMetadata() {
    iterate(this.applicationProvidersApplyMap)
      .filter(wrapper => this.isRequestOrTransient(wrapper.scope))
      .forEach(({ moduleKey, providerKey }) => {
        const modulesContainer = this.container.getModules();
        const { injectables } = modulesContainer.get(moduleKey);
        const instanceWrapper = injectables.get(providerKey);

        iterate(modulesContainer.values())
          .map(module => module.controllers.values())
          .flatten()
          .forEach(controller =>
            controller.addEnhancerMetadata(instanceWrapper),
          );
      });
  }

  public applyApplicationProviders() {
    const applyProvidersMap = this.getApplyProvidersMap();
    const applyRequestProvidersMap = this.getApplyRequestProvidersMap();

    const getInstanceWrapper = (
      moduleKey: string,
      providerKey: string,
      collectionKey: 'providers' | 'injectables',
    ) => {
      const modules = this.container.getModules();
      const collection = modules.get(moduleKey)[collectionKey];
      return collection.get(providerKey);
    };

    // Add global enhancers to the application config
    this.applicationProvidersApplyMap.forEach(
      ({ moduleKey, providerKey, type, scope }) => {
        let instanceWrapper: InstanceWrapper;
        if (this.isRequestOrTransient(scope)) {
          instanceWrapper = getInstanceWrapper(
            moduleKey,
            providerKey,
            'injectables',
          );
          return applyRequestProvidersMap[type as string](instanceWrapper);
        }
        instanceWrapper = getInstanceWrapper(
          moduleKey,
          providerKey,
          'providers',
        );
        applyProvidersMap[type as string](instanceWrapper.instance);
      },
    );
  }

  public getApplyProvidersMap(): { [type: string]: Function } {
    return {
      [APP_INTERCEPTOR]: (interceptor: NestInterceptor) =>
        this.applicationConfig.addGlobalInterceptor(interceptor),
      [APP_PIPE]: (pipe: PipeTransform) =>
        this.applicationConfig.addGlobalPipe(pipe),
      [APP_GUARD]: (guard: CanActivate) =>
        this.applicationConfig.addGlobalGuard(guard),
      [APP_FILTER]: (filter: ExceptionFilter) =>
        this.applicationConfig.addGlobalFilter(filter),
    };
  }

  public getApplyRequestProvidersMap(): { [type: string]: Function } {
    return {
      [APP_INTERCEPTOR]: (interceptor: InstanceWrapper<NestInterceptor>) =>
        this.applicationConfig.addGlobalRequestInterceptor(interceptor),
      [APP_PIPE]: (pipe: InstanceWrapper<PipeTransform>) =>
        this.applicationConfig.addGlobalRequestPipe(pipe),
      [APP_GUARD]: (guard: InstanceWrapper<CanActivate>) =>
        this.applicationConfig.addGlobalRequestGuard(guard),
      [APP_FILTER]: (filter: InstanceWrapper<ExceptionFilter>) =>
        this.applicationConfig.addGlobalRequestFilter(filter),
    };
  }

  public isDynamicModule(
    module: Type<any> | DynamicModule,
  ): module is DynamicModule {
    return module && !!(module as DynamicModule).module;
  }

  public isForwardReference(
    module: Type<any> | DynamicModule | ForwardReference,
  ): module is ForwardReference {
    return module && !!(module as ForwardReference).forwardRef;
  }

  private flatten<T = any>(arr: T[][]): T[] {
    return arr.reduce((a: T[], b: T[]) => a.concat(b), []);
  }

  private isRequestOrTransient(scope: Scope): boolean {
    return scope === Scope.REQUEST || scope === Scope.TRANSIENT;
  }
}
