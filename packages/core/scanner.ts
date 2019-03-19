import {
  DynamicModule,
  ForwardReference,
  Provider,
  Abstract,
} from '@nestjs/common';
import {
  EXCEPTION_FILTERS_METADATA,
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
  METADATA,
  PIPES_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';
import {
  ClassProvider,
  FactoryProvider,
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
import { ApplicationConfig } from './application-config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from './constants';
import { CircularDependencyException } from './errors/exceptions/circular-dependency.exception';
import { NestContainer } from './injector/container';
import { Module } from './injector/module';
import { MetadataScanner } from './metadata-scanner';

interface ApplicationProviderWrapper {
  moduleKey: string;
  providerKey: string;
  type: string | symbol | Type<any> | Abstract<any>;
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
    this.container.bindGlobalScope();
  }

  public async scanForModules(
    module: ForwardReference | Type<any> | DynamicModule,
    scope: Type<any>[] = [],
    ctxRegistry: (ForwardReference | DynamicModule | Type<any>)[] = [],
  ): Promise<Module> {
    const moduleInstance = await this.insertModule(module, scope);
    ctxRegistry.push(module);

    if (this.isForwardReference(module)) {
      module = (module as ForwardReference).forwardRef();
    }
    const modules = !this.isDynamicModule(module as Type<any> | DynamicModule)
      ? this.reflectMetadata(module as Type<any>, METADATA.IMPORTS)
      : [
          ...this.reflectMetadata(
            (module as DynamicModule).module,
            METADATA.IMPORTS,
          ),
          ...((module as DynamicModule).imports || []),
        ];

    for (const innerModule of modules) {
      if (ctxRegistry.includes(innerModule)) {
        continue;
      }
      await this.scanForModules(
        innerModule,
        [].concat(scope, module),
        ctxRegistry,
      );
    }
    return moduleInstance;
  }

  public async insertModule(module: any, scope: Type<any>[]): Promise<Module> {
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
  }

  public async reflectImports(
    module: Type<any>,
    token: string,
    context: string,
  ) {
    const modules = [
      ...this.reflectMetadata(module, METADATA.IMPORTS),
      ...this.container.getDynamicMetadataByToken(
        token,
        METADATA.IMPORTS as 'imports',
      ),
    ];
    for (const related of modules) {
      await this.insertImport(related, token, context);
    }
  }

  public reflectProviders(module: Type<any>, token: string) {
    const providers = [
      ...this.reflectMetadata(module, METADATA.PROVIDERS),
      ...this.container.getDynamicMetadataByToken(
        token,
        METADATA.PROVIDERS as 'providers',
      ),
    ];
    providers.forEach(provider => {
      this.insertProvider(provider, token);
      this.reflectDynamicMetadata(provider, token);
    });
  }

  public reflectControllers(module: Type<any>, token: string) {
    const controllers = [
      ...this.reflectMetadata(module, METADATA.CONTROLLERS),
      ...this.container.getDynamicMetadataByToken(
        token,
        METADATA.CONTROLLERS as 'controllers',
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

  public reflectExports(module: Type<any>, token: string) {
    const exports = [
      ...this.reflectMetadata(module, METADATA.EXPORTS),
      ...this.container.getDynamicMetadataByToken(
        token,
        METADATA.EXPORTS as 'exports',
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
    const flattenMethodsInjectables = methodsInjectables.reduce<any[]>(
      (a: any[], b) => a.concat(b),
      [],
    );
    const injectables = [
      ...controllerInjectables,
      ...flattenMethodsInjectables,
    ].filter(isFunction);

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
    const flatten = (arr: any[]) =>
      arr.reduce((a: any[], b: any[]) => a.concat(b), []);
    const paramsInjectables = flatten(paramsMetadata).map(
      (param: Record<string, any>) =>
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
      // tslint:disable-next-line:no-conditional-assignment
      (prototype = Reflect.getPrototypeOf(prototype)) &&
      prototype !== Object.prototype &&
      prototype
    );
    return undefined;
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
  ): provider is ClassProvider | ValueProvider | FactoryProvider {
    return provider && !isNil((provider as any).provide);
  }

  public insertProvider(provider: Provider, token: string) {
    const isCustomProvider = this.isCustomProvider(provider);
    if (!isCustomProvider) {
      return this.container.addProvider(provider as Type<any>, token);
    }
    const applyProvidersMap = this.getApplyProvidersMap();
    const providersKeys = Object.keys(applyProvidersMap);
    const type = (provider as ClassProvider | ValueProvider | FactoryProvider)
      .provide;

    if (!providersKeys.includes(type as string)) {
      return this.container.addProvider(provider as any, token);
    }
    const providerToken = randomStringGenerator();
    this.applicationProvidersApplyMap.push({
      type,
      moduleKey: token,
      providerKey: providerToken,
    });
    this.container.addProvider(
      {
        ...provider,
        provide: providerToken,
      } as any,
      token,
    );
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

  public applyApplicationProviders() {
    const applyProvidersMap = this.getApplyProvidersMap();
    this.applicationProvidersApplyMap.forEach(
      ({ moduleKey, providerKey, type }) => {
        const modules = this.container.getModules();
        const { providers } = modules.get(moduleKey);
        const { instance } = providers.get(providerKey);

        applyProvidersMap[type as string](instance);
      },
    );
  }

  public getApplyProvidersMap(): { [type: string]: Function } {
    return {
      [APP_INTERCEPTOR]: (interceptor: any) =>
        this.applicationConfig.addGlobalInterceptor(interceptor),
      [APP_PIPE]: (pipe: any) => this.applicationConfig.addGlobalPipe(pipe),
      [APP_GUARD]: (guard: any) => this.applicationConfig.addGlobalGuard(guard),
      [APP_FILTER]: (filter: any) =>
        this.applicationConfig.addGlobalFilter(filter),
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
}
