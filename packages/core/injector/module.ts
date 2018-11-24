import {
  Controller,
  DynamicModule,
  Injectable,
  NestModule,
} from '@nestjs/common/interfaces';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import {
  isFunction,
  isNil,
  isString,
  isSymbol,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { InvalidClassException } from '../errors/exceptions/invalid-class.exception';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { UnknownExportException } from '../errors/exceptions/unknown-export.exception';
import { ApplicationReferenceHost } from '../helpers/application-ref-host';
import { ExternalContextCreator } from '../helpers/external-context-creator';
import { Reflector } from '../services/reflector.service';
import { InstanceWrapper, NestContainer } from './container';
import { ModuleRef } from './module-ref';
import { ModulesContainer } from './modules-container';
import { HTTP_SERVER_REF } from './tokens';

export interface CustomProvider {
  provide: any;
  name: string;
}
export type OpaqueToken = string | symbol | object | Type<any>;
export type CustomClass = CustomProvider & { useClass: Type<any> };
export type CustomFactory = CustomProvider & {
  useFactory: (...args: any[]) => any;
  inject?: OpaqueToken[];
};
export type CustomValue = CustomProvider & { useValue: any };
export type ProviderMetatype =
  | Type<Injectable>
  | CustomFactory
  | CustomValue
  | CustomClass;

export class Module {
  private readonly _id: string;
  private readonly _relatedModules = new Set<Module>();
  private readonly _providers = new Map<any, InstanceWrapper<Injectable>>();
  private readonly _injectables = new Map<any, InstanceWrapper<Injectable>>();
  private readonly _controllers = new Map<
    string,
    InstanceWrapper<Controller>
  >();
  private readonly _exports = new Set<string>();

  constructor(
    private readonly _metatype: Type<any>,
    private readonly _scope: Type<any>[],
    private readonly container: NestContainer,
  ) {
    this.addCoreProviders(container);
    this._id = randomStringGenerator();
  }

  get id(): string {
    return this._id;
  }

  get scope(): Type<any>[] {
    return this._scope;
  }

  get relatedModules(): Set<Module> {
    return this._relatedModules;
  }

  get providers(): Map<string, InstanceWrapper<Injectable>> {
    return this._providers;
  }

  /**
   * Left for backward-compatibility reasons
   */
  get components(): Map<string, InstanceWrapper<Injectable>> {
    return this._providers;
  }

  /**
   * Left for backward-compatibility reasons
   */
  get routes(): Map<string, InstanceWrapper<Controller>> {
    return this._controllers;
  }

  get injectables(): Map<string, InstanceWrapper<Injectable>> {
    return this._injectables;
  }

  get controllers(): Map<string, InstanceWrapper<Controller>> {
    return this._controllers;
  }

  get exports(): Set<string> {
    return this._exports;
  }

  get instance(): NestModule {
    if (!this._providers.has(this._metatype.name)) {
      throw new RuntimeException();
    }
    const module = this._providers.get(this._metatype.name);
    return module.instance as NestModule;
  }

  get metatype(): Type<any> {
    return this._metatype;
  }

  public addCoreProviders(container: NestContainer) {
    this.addModuleAsProvider();
    this.addModuleRef();
    this.addReflector(container.getReflector());
    this.addApplicationRef(container.getApplicationRef());
    this.addExternalContextCreator(container.getExternalContextCreator());
    this.addModulesContainer(container.getModulesContainer());
    this.addApplicationRefHost(container.getApplicationRefHost());
  }

  public addModuleRef() {
    const moduleRef = this.createModuleRefMetatype();
    this._providers.set(ModuleRef.name, {
      name: ModuleRef.name,
      metatype: ModuleRef as any,
      isResolved: true,
      instance: new moduleRef(),
    });
  }

  public addModuleAsProvider() {
    this._providers.set(this._metatype.name, {
      name: this._metatype.name,
      metatype: this._metatype,
      isResolved: false,
      instance: null,
    });
  }

  public addReflector(reflector: Reflector) {
    this._providers.set(Reflector.name, {
      name: Reflector.name,
      metatype: Reflector,
      isResolved: true,
      instance: reflector,
    });
  }

  public addApplicationRef(applicationRef: any) {
    this._providers.set(HTTP_SERVER_REF, {
      name: HTTP_SERVER_REF,
      metatype: {} as any,
      isResolved: true,
      instance: applicationRef || {},
    });
  }

  public addExternalContextCreator(
    externalContextCreator: ExternalContextCreator,
  ) {
    this._providers.set(ExternalContextCreator.name, {
      name: ExternalContextCreator.name,
      metatype: ExternalContextCreator,
      isResolved: true,
      instance: externalContextCreator,
    });
  }

  public addModulesContainer(modulesContainer: ModulesContainer) {
    this._providers.set(ModulesContainer.name, {
      name: ModulesContainer.name,
      metatype: ModulesContainer,
      isResolved: true,
      instance: modulesContainer,
    });
  }

  public addApplicationRefHost(applicationRefHost: ApplicationReferenceHost) {
    this._providers.set(ApplicationReferenceHost.name, {
      name: ApplicationReferenceHost.name,
      metatype: ApplicationReferenceHost,
      isResolved: true,
      instance: applicationRefHost,
    });
  }

  public addInjectable<T = Injectable>(injectable: Type<T>) {
    if (this.isCustomProvider(injectable)) {
      return this.addCustomProvider(injectable, this._injectables);
    }
    this._injectables.set(injectable.name, {
      name: injectable.name,
      metatype: injectable,
      instance: null,
      isResolved: false,
    });
  }

  public addProvider(provider: ProviderMetatype): string {
    if (this.isCustomProvider(provider)) {
      return this.addCustomProvider(provider, this._providers);
    }
    this._providers.set((provider as Type<Injectable>).name, {
      name: (provider as Type<Injectable>).name,
      metatype: provider as Type<Injectable>,
      instance: null,
      isResolved: false,
    });
    return (provider as Type<Injectable>).name;
  }

  public isCustomProvider(
    provider: ProviderMetatype,
  ): provider is CustomClass | CustomFactory | CustomValue {
    return !isNil((provider as CustomProvider).provide);
  }

  public addCustomProvider(
    provider: CustomFactory | CustomValue | CustomClass,
    collection: Map<string, any>,
  ): string {
    const { provide } = provider;
    const name = isFunction(provide) ? provide.name : provide;
    const providerNamePair = {
      ...provider,
      name,
    };
    if (this.isCustomClass(providerNamePair))
      this.addCustomClass(providerNamePair, collection);
    else if (this.isCustomValue(providerNamePair))
      this.addCustomValue(providerNamePair, collection);
    else if (this.isCustomFactory(providerNamePair))
      this.addCustomFactory(providerNamePair, collection);

    return name;
  }

  public isCustomClass(provider): provider is CustomClass {
    return !isUndefined((provider as CustomClass).useClass);
  }

  public isCustomValue(provider): provider is CustomValue {
    return !isUndefined((provider as CustomValue).useValue);
  }

  public isCustomFactory(provider): provider is CustomFactory {
    return !isUndefined((provider as CustomFactory).useFactory);
  }

  public isDynamicModule(exported): exported is DynamicModule {
    return exported && exported.module;
  }

  public addCustomClass(provider: CustomClass, collection: Map<string, any>) {
    const { name, useClass } = provider;
    collection.set(name, {
      name,
      metatype: useClass,
      instance: null,
      isResolved: false,
    });
  }

  public addCustomValue(provider: CustomValue, collection: Map<string, any>) {
    const { name, useValue: value } = provider;
    collection.set(name, {
      name,
      metatype: null,
      instance: value,
      isResolved: true,
      isNotMetatype: true,
      async: value instanceof Promise,
    });
  }

  public addCustomFactory(
    provider: CustomFactory,
    collection: Map<string, any>,
  ) {
    const { name, useFactory: factory, inject } = provider;
    collection.set(name, {
      name,
      metatype: factory as any,
      instance: null,
      isResolved: false,
      inject: inject || [],
      isNotMetatype: true,
    });
  }

  public addExportedProvider(
    provider: ProviderMetatype | string | DynamicModule,
  ) {
    const addExportedUnit = (token: string) =>
      this._exports.add(this.validateExportedProvider(token));

    if (this.isCustomProvider(provider as any)) {
      return this.addCustomExportedProvider(provider as any);
    } else if (isString(provider)) {
      return addExportedUnit(provider);
    } else if (this.isDynamicModule(provider)) {
      const { module } = provider;
      return addExportedUnit(module.name);
    }
    addExportedUnit(provider.name);
  }

  public addCustomExportedProvider(
    provider: CustomFactory | CustomValue | CustomClass,
  ) {
    const provide = provider.provide;
    if (isString(provide) || isSymbol(provide)) {
      return this._exports.add(this.validateExportedProvider(provide));
    }
    this._exports.add(this.validateExportedProvider(provide.name));
  }

  public validateExportedProvider(token: string) {
    if (this._providers.has(token)) {
      return token;
    }
    const importedArray = [...this._relatedModules.values()];
    const importedRefNames = importedArray
      .filter(item => item)
      .map(({ metatype }) => metatype)
      .filter(metatype => metatype)
      .map(({ name }) => name);

    if (!importedRefNames.includes(token)) {
      const { name } = this.metatype;
      throw new UnknownExportException(name);
    }
    return token;
  }

  public addController(controller: Type<Controller>) {
    this._controllers.set(controller.name, {
      name: controller.name,
      metatype: controller,
      instance: null,
      isResolved: false,
    });
  }

  public addRelatedModule(module: any) {
    this._relatedModules.add(module);
  }

  public replace(toReplace: string | symbol | Type<any>, options: any) {
    if (options.isProvider) {
      return this.addProvider({ provide: toReplace, ...options });
    }
    this.addInjectable({
      provide: toReplace,
      ...options,
    });
  }

  public createModuleRefMetatype(): any {
    const self = this;
    return class extends ModuleRef {
      constructor() {
        super(self.container);
      }

      public get<TInput = any, TResult = TInput>(
        typeOrToken: Type<TInput> | string | symbol,
        options: { strict: boolean } = { strict: true },
      ): TResult {
        if (!(options && options.strict)) {
          return this.find<TInput, TResult>(typeOrToken);
        }
        return this.findInstanceByPrototypeOrToken<TInput, TResult>(
          typeOrToken,
          self,
        );
      }

      public async create<T = any>(type: Type<T>): Promise<T> {
        if (!(type && isFunction(type) && type.prototype)) {
          throw new InvalidClassException(type);
        }
        return this.instantiateClass<T>(type, self);
      }
    };
  }
}
