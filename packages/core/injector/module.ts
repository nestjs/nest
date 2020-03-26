import {
  Abstract,
  ClassProvider,
  Controller,
  DynamicModule,
  ExistingProvider,
  FactoryProvider,
  Injectable,
  NestModule,
  Provider,
  ValueProvider,
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
import { ApplicationConfig } from '../application-config';
import { InvalidClassException } from '../errors/exceptions/invalid-class.exception';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { UnknownExportException } from '../errors/exceptions/unknown-export.exception';
import { createContextId } from '../helpers';
import { getClassScope } from '../helpers/get-class-scope';
import { CONTROLLER_ID_KEY } from './constants';
import { NestContainer } from './container';
import { InstanceWrapper } from './instance-wrapper';
import { ModuleRef } from './module-ref';
import { iterate } from 'iterare';

interface ProviderName {
  name?: string | symbol;
}

export class Module {
  private readonly _id: string;
  private readonly _imports = new Set<Module>();
  private readonly _providers = new Map<any, InstanceWrapper<Injectable>>();
  private readonly _injectables = new Map<any, InstanceWrapper<Injectable>>();
  private readonly _middlewares = new Map<any, InstanceWrapper<Injectable>>();
  private readonly _controllers = new Map<
    string,
    InstanceWrapper<Controller>
  >();
  private readonly _exports = new Set<string | symbol>();
  private _distance = 0;

  constructor(
    private readonly _metatype: Type<any>,
    private readonly _scope: Type<any>[],
    private readonly container: NestContainer,
  ) {
    this.addCoreProviders();
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

  get middlewares(): Map<any, InstanceWrapper<Injectable>> {
    return this._middlewares;
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

  get distance(): number {
    return this._distance;
  }

  set distance(value: number) {
    this._distance = value;
  }

  public addCoreProviders() {
    this.addModuleAsProvider();
    this.addModuleRef();
    this.addApplicationConfig();
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

  public addApplicationConfig() {
    this._providers.set(
      ApplicationConfig.name,
      new InstanceWrapper({
        name: ApplicationConfig.name,
        isResolved: true,
        instance: this.container.applicationConfig,
        host: this,
      }),
    );
  }

  public addInjectable<T extends Injectable>(
    injectable: Provider,
    host?: Type<T>,
  ) {
    if (this.isCustomProvider(injectable)) {
      return this.addCustomProvider(injectable, this._injectables);
    }
    let instanceWrapper = this.injectables.get(injectable.name);
    if (!instanceWrapper) {
      instanceWrapper = new InstanceWrapper({
        name: injectable.name,
        metatype: injectable,
        instance: null,
        isResolved: false,
        scope: getClassScope(injectable),
        host: this,
      });
      this._injectables.set(injectable.name, instanceWrapper);
    }
    if (host) {
      const token = host && host.name;
      const hostWrapper =
        this._controllers.get(host && host.name) || this._providers.get(token);
      hostWrapper && hostWrapper.addEnhancerMetadata(instanceWrapper);
    }
  }

  public addProvider(provider: Provider): string {
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
        scope: getClassScope(provider),
        host: this,
      }),
    );
    return (provider as Type<Injectable>).name;
  }

  public isCustomProvider(
    provider: Provider,
  ): provider is
    | ClassProvider
    | FactoryProvider
    | ValueProvider
    | ExistingProvider {
    return !isNil(
      (provider as
        | ClassProvider
        | FactoryProvider
        | ValueProvider
        | ExistingProvider).provide,
    );
  }

  public addCustomProvider(
    provider: (
      | ClassProvider
      | FactoryProvider
      | ValueProvider
      | ExistingProvider
    ) &
      ProviderName,
    collection: Map<string, any>,
  ): string {
    const name = this.getProviderStaticToken(provider.provide) as string;
    provider = {
      ...provider,
      name,
    };
    if (this.isCustomClass(provider)) {
      this.addCustomClass(provider, collection);
    } else if (this.isCustomValue(provider)) {
      this.addCustomValue(provider, collection);
    } else if (this.isCustomFactory(provider)) {
      this.addCustomFactory(provider, collection);
    } else if (this.isCustomUseExisting(provider)) {
      this.addCustomUseExisting(provider, collection);
    }
    return name;
  }

  public isCustomClass(provider: any): provider is ClassProvider {
    return !isUndefined((provider as ClassProvider).useClass);
  }

  public isCustomValue(provider: any): provider is ValueProvider {
    return !isUndefined((provider as ValueProvider).useValue);
  }

  public isCustomFactory(provider: any): provider is FactoryProvider {
    return !isUndefined((provider as FactoryProvider).useFactory);
  }

  public isCustomUseExisting(provider: any): provider is ExistingProvider {
    return !isUndefined((provider as ExistingProvider).useExisting);
  }

  public isDynamicModule(exported: any): exported is DynamicModule {
    return exported && exported.module;
  }

  public addCustomClass(
    provider: ClassProvider & ProviderName,
    collection: Map<string, InstanceWrapper>,
  ) {
    const { name, useClass } = provider;

    let { scope } = provider;
    if (isUndefined(scope)) {
      scope = getClassScope(useClass);
    }
    collection.set(
      name as string,
      new InstanceWrapper({
        name,
        metatype: useClass,
        instance: null,
        isResolved: false,
        scope,
        host: this,
      }),
    );
  }

  public addCustomValue(
    provider: ValueProvider & ProviderName,
    collection: Map<string, InstanceWrapper>,
  ) {
    const { name, useValue: value } = provider;
    collection.set(
      name as string,
      new InstanceWrapper({
        name,
        metatype: null,
        instance: value,
        isResolved: true,
        async: value instanceof Promise,
        host: this,
      }),
    );
  }

  public addCustomFactory(
    provider: FactoryProvider & ProviderName,
    collection: Map<string, InstanceWrapper>,
  ) {
    const { name, useFactory: factory, inject, scope } = provider;
    collection.set(
      name as string,
      new InstanceWrapper({
        name,
        metatype: factory as any,
        instance: null,
        isResolved: false,
        inject: inject || [],
        scope,
        host: this,
      }),
    );
  }

  public addCustomUseExisting(
    provider: ExistingProvider & ProviderName,
    collection: Map<string, InstanceWrapper>,
  ) {
    const { name, useExisting } = provider;
    collection.set(
      name as string,
      new InstanceWrapper({
        name,
        metatype: (instance => instance) as any,
        instance: null,
        isResolved: false,
        inject: [useExisting],
        host: this,
        isAlias: true,
      }),
    );
  }

  public addExportedProvider(
    provider: (Provider & ProviderName) | string | symbol | DynamicModule,
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
    provider:
      | FactoryProvider
      | ValueProvider
      | ClassProvider
      | ExistingProvider,
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
    const importsNames = iterate(importsArray)
      .filter(item => !!item)
      .map(({ metatype }) => metatype)
      .filter(metatype => !!metatype)
      .map(({ name }) => name)
      .toArray();

    if (!importsNames.includes(token as any)) {
      const { name } = this.metatype;
      throw new UnknownExportException(token as any, name);
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
        scope: getClassScope(controller),
        host: this,
      }),
    );

    this.assignControllerUniqueId(controller);
  }

  public assignControllerUniqueId(controller: Type<Controller>) {
    Object.defineProperty(controller, CONTROLLER_ID_KEY, {
      enumerable: false,
      writable: false,
      configurable: true,
      value: randomStringGenerator(),
    });
  }

  public addRelatedModule(module: Module) {
    this._imports.add(module);
  }

  public replace(toReplace: string | symbol | Type<any>, options: any) {
    if (options.isProvider && this.hasProvider(toReplace)) {
      const name = this.getProviderStaticToken(toReplace);
      const originalProvider = this._providers.get(name);

      return originalProvider.mergeWith({ provide: toReplace, ...options });
    } else if (!options.isProvider && this.hasInjectable(toReplace)) {
      const name = this.getProviderStaticToken(toReplace);
      const originalInjectable = this._injectables.get(name);

      return originalInjectable.mergeWith({
        provide: toReplace,
        ...options,
      });
    }
  }

  public hasProvider(token: string | symbol | Type<any>): boolean {
    const name = this.getProviderStaticToken(token);
    return this._providers.has(name);
  }

  public hasInjectable(token: string | symbol | Type<any>): boolean {
    const name = this.getProviderStaticToken(token);
    return this._injectables.has(name);
  }

  public getProviderStaticToken(
    provider: string | symbol | Type<any> | Abstract<any>,
  ): string | symbol {
    return isFunction(provider)
      ? (provider as Function).name
      : (provider as string | symbol);
  }

  public getProviderByKey<T = any>(name: string | symbol): InstanceWrapper<T> {
    return this._providers.get(name) as InstanceWrapper<T>;
  }

  public getNonAliasProviders(): Array<[string, InstanceWrapper<Injectable>]> {
    return [...this._providers].filter(([_, wrapper]) => !wrapper.isAlias);
  }

  public createModuleReferenceType(): any {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
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
        return this.findInstanceByToken<TInput, TResult>(typeOrToken, self);
      }

      public resolve<TInput = any, TResult = TInput>(
        typeOrToken: Type<TInput> | string | symbol,
        contextId = createContextId(),
        options: { strict: boolean } = { strict: true },
      ): Promise<TResult> {
        return this.resolvePerContext(typeOrToken, self, contextId, options);
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
