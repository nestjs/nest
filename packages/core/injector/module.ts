import { Scope } from '@nestjs/common';
import { SCOPE_OPTIONS_METADATA } from '@nestjs/common/constants';
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
import { MixedMultiProviderException } from '../errors/exceptions/mixed-multi-provider.exception';
import { NestContainer } from './container';
import { InstanceWrapper } from './instance-wrapper';
import { ModuleRef } from './module-ref';

export interface CustomProvider {
  provide: any;
  name: string;
  /**
   * If true, then injector returns an array of instances. This is useful to allow multiple
   * providers spread across many files to provide configuration information to a common token.
   */
  multi?: boolean;
}
export type OpaqueToken = string | symbol | Type<any>;
export type CustomClass = CustomProvider & {
  useClass: Type<any>;
  scope?: Scope;
};
export type CustomFactory = CustomProvider & {
  useFactory: (...args: any[]) => any;
  inject?: OpaqueToken[];
  scope?: Scope;
};
export type CustomValue = CustomProvider & { useValue: any };
export type ProviderMetatype =
  | Type<Injectable>
  | CustomFactory
  | CustomValue
  | CustomClass;

/**
 * The factory which will be used for multi providers
 */
const MULTI_PROVIDER_FACTORY =  ((...args) => args) as any;

export class Module {
  private readonly _id: string;
  private readonly _imports = new Set<Module>();
  private readonly _providers = new Map<any, InstanceWrapper<Injectable>>();
  private readonly _injectables = new Map<any, InstanceWrapper<Injectable>>();
  private readonly _controllers = new Map<
    string,
    InstanceWrapper<Controller>
  >();
  private readonly _exports = new Set<string | symbol>();

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

  get providers(): Map<any, InstanceWrapper<Injectable>> {
    return this._providers;
  }

  get imports(): Set<Module> {
    return this._imports;
  }

  /**
   * Left for backward-compatibility reasons
   */
  get relatedModules(): Set<Module> {
    return this._imports;
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

  get exports(): Set<string | symbol> {
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
  }

  public addModuleRef() {
    const moduleRef = this.createModuleReferenceType();
    this._providers.set(
      ModuleRef.name,
      new InstanceWrapper({
        name: ModuleRef.name,
        metatype: ModuleRef as any,
        isResolved: true,
        instance: new moduleRef(),
        host: this,
      }),
    );
  }

  public addModuleAsProvider() {
    this._providers.set(
      this._metatype.name,
      new InstanceWrapper({
        name: this._metatype.name,
        metatype: this._metatype,
        isResolved: false,
        instance: null,
        host: this,
      }),
    );
  }

  public addInjectable<T extends Injectable>(
    injectable: Type<T>,
    host?: Type<T>,
  ) {
    if (this.isCustomProvider(injectable)) {
      return this.addCustomProvider(injectable, this._injectables);
    }
    const instanceWrapper = new InstanceWrapper({
      name: injectable.name,
      metatype: injectable,
      instance: null,
      isResolved: false,
      scope: this.getClassScope(injectable),
      host: this,
    });
    this._injectables.set(injectable.name, instanceWrapper);

    if (host) {
      const hostWrapper = this._controllers.get(host && host.name);
      hostWrapper && hostWrapper.addEnhancerMetadata(instanceWrapper);
    }
  }

  public addProvider(provider: ProviderMetatype): string {
    if (this.isCustomProvider(provider)) {
      return this.addCustomProvider(provider, this._providers);
    }
    this._providers.set(
      (provider as Type<Injectable>).name,
      new InstanceWrapper({
        name: (provider as Type<Injectable>).name,
        metatype: provider as Type<Injectable>,
        instance: null,
        isResolved: false,
        scope: this.getClassScope(provider),
        host: this,
      }),
    );
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
    let name = isFunction(provide) ? provide.name : provide;

    provider = {
      ...provider,
      name,
    };

    this.checkForMixedMulti(provider, collection);

    if (provider.multi === true) {
      // Add a multi provider in case the multi option equals true
      name = this.addMultiProvider(provider, collection);
      provider = {
        ...provider,
        name,
      };
    }

    if (this.isCustomClass(provider)) {
      this.addCustomClass(provider, collection);
    } else if (this.isCustomValue(provider)) {
      this.addCustomValue(provider, collection);
    } else if (this.isCustomFactory(provider)) {
      this.addCustomFactory(provider, collection);
    }

    return name;
  }

  public isCustomClass(provider: any): provider is CustomClass {
    return !isUndefined((provider as CustomClass).useClass);
  }

  public isCustomValue(provider: any): provider is CustomValue {
    return !isUndefined((provider as CustomValue).useValue);
  }

  public isCustomFactory(provider: any): provider is CustomFactory {
    return !isUndefined((provider as CustomFactory).useFactory);
  }

  public isDynamicModule(exported: any): exported is DynamicModule {
    return exported && exported.module;
  }

  /**
   * Checks if the already stored provider has the same `multi` value
   * as the new provider.
   *
   * @param storedProvider The already stored provider
   * @param provider The provider which should get newly added
   *
   * @throws {MixedMultiProviderException}
   * If the `multi` option of the stored provider differs from the given provider
   */
  private checkForMixedMulti(
    provider: CustomProvider,
    collection: Map<string, InstanceWrapper>,
  ) {
    // Get provider which is already stored in the collection.
    const storedProvider = collection.get(provider.provide);
    if (storedProvider) {
      // Multiple provider use the same key.
      // Check if the new provider has the same multi value
      if (provider.multi !== !!storedProvider.multi) {
        // It has mixed multi option
        throw new MixedMultiProviderException(provider.name);
      }
    }
  }

  /**
   * Adds a new provider which acts as a multi provider.
   * A multi provider is a custom factory which returns all the
   * values as an array of the same token.
   *
   * @returns {any}
   * The new token which should be used for the given provider,
   * because the new created multi provider will be using the
   * token of the given provider.
   *
   * @param provider The provider which is a multi provider
   * @param collection The collection to add the multi provider to
   */
  private addMultiProvider(
    provider: CustomProvider,
    collection: Map<string, InstanceWrapper>,
  ): any {
    const { multi } = provider;

    // Get provider which is already stored in the collection.
    const storedProvider = collection.get(provider.provide);

    let token = provider.provide;

    let inject: any[] = null;
    const multiProviderToken = provider.provide;

    token = provider;

    // If the provider indicates that it's a multi-provider, process it specially.
    // First check whether it's been defined already.
    if (storedProvider) {
      // A provider already exists. Append new value
      inject = [
        ...(storedProvider.inject || []),
        token
      ];
    } else {
      // First multi provider with this token
      inject = [token];
    }

    collection.set(
      multiProviderToken,
      // The new multi provider
      new InstanceWrapper({
        name: multiProviderToken,
        // Returns all the inject arguments as array
        metatype: MULTI_PROVIDER_FACTORY,
        inject,
        instance: null,
        isResolved: false,
        multi,
        host: this,
      }),
    );
    return token;
  }

  public addCustomClass(
    provider: CustomClass,
    collection: Map<string, InstanceWrapper>,
  ) {
    const { name, useClass, scope, multi } = provider;
    collection.set(
      name,
      new InstanceWrapper({
        name,
        metatype: useClass,
        instance: null,
        isResolved: false,
        scope,
        host: this,
        multi,
      }),
    );
  }

  public addCustomValue(
    provider: CustomValue,
    collection: Map<string, InstanceWrapper>,
  ) {
    const { name, useValue: value, multi } = provider;
    collection.set(
      name,
      new InstanceWrapper({
        name,
        metatype: null,
        instance: value,
        isResolved: true,
        async: value instanceof Promise,
        host: this,
        multi,
      }),
    );
  }

  public addCustomFactory(
    provider: CustomFactory,
    collection: Map<string, InstanceWrapper>,
  ) {
    const { name, useFactory: factory, inject, scope, multi } = provider;
    collection.set(
      name,
      new InstanceWrapper({
        name,
        metatype: factory as any,
        instance: null,
        isResolved: false,
        inject: inject || [],
        scope,
        host: this,
        multi,
      }),
    );
  }

  public addExportedProvider(
    provider: ProviderMetatype | string | symbol | DynamicModule,
  ) {
    const addExportedUnit = (token: string | symbol) =>
      this._exports.add(this.validateExportedProvider(token));

    if (this.isCustomProvider(provider as any)) {
      return this.addCustomExportedProvider(provider as any);
    } else if (isString(provider) || isSymbol(provider)) {
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

  public validateExportedProvider(token: string | symbol) {
    if (this._providers.has(token)) {
      return token;
    }
    const importsArray = [...this._imports.values()];
    const importsNames = importsArray
      .filter(item => item)
      .map(({ metatype }) => metatype)
      .filter(metatype => metatype)
      .map(({ name }) => name);

    if (!importsNames.includes(token as any)) {
      const { name } = this.metatype;
      throw new UnknownExportException(name);
    }
    return token;
  }

  public addController(controller: Type<Controller>) {
    this._controllers.set(
      controller.name,
      new InstanceWrapper({
        name: controller.name,
        metatype: controller,
        instance: null,
        isResolved: false,
        scope: this.getClassScope(controller),
        host: this,
      }),
    );
  }

  public addRelatedModule(module: any) {
    this._imports.add(module);
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

  public getProviderByKey<T = any>(name: string | symbol): InstanceWrapper<T> {
    return this._providers.get(name) as InstanceWrapper<T>;
  }

  public createModuleReferenceType(): any {
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

  private getClassScope(provider: ProviderMetatype): Scope {
    const metadata = Reflect.getMetadata(SCOPE_OPTIONS_METADATA, provider);
    return metadata && metadata.scope;
  }
}
