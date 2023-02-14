import {
  EnhancerSubtype,
  ENTRY_PROVIDER_WATERMARK,
} from '@nestjs/common/constants';
import {
  ClassProvider,
  Controller,
  DynamicModule,
  ExistingProvider,
  FactoryProvider,
  Injectable,
  InjectionToken,
  NestModule,
  Provider,
  Type,
  ValueProvider,
} from '@nestjs/common/interfaces';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import {
  isFunction,
  isNil,
  isString,
  isSymbol,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import { ApplicationConfig } from '../application-config';
import {
  InvalidClassException,
  RuntimeException,
  UnknownExportException,
} from '../errors/exceptions';
import { createContextId } from '../helpers/context-id-factory';
import { getClassScope } from '../helpers/get-class-scope';
import { isDurable } from '../helpers/is-durable';
import { UuidFactory } from '../inspector/uuid-factory';
import { CONTROLLER_ID_KEY } from './constants';
import { NestContainer } from './container';
import { InstanceWrapper } from './instance-wrapper';
import { ModuleRef, ModuleRefGetOrResolveOpts } from './module-ref';

/**
 * @note
 * Left for backward compatibility
 */
export type InstanceToken = InjectionToken;

export class Module {
  private readonly _id: string;
  private readonly _imports = new Set<Module>();
  private readonly _providers = new Map<
    InstanceToken,
    InstanceWrapper<Injectable>
  >();
  private readonly _injectables = new Map<
    InstanceToken,
    InstanceWrapper<Injectable>
  >();
  private readonly _middlewares = new Map<
    InstanceToken,
    InstanceWrapper<Injectable>
  >();
  private readonly _controllers = new Map<
    InstanceToken,
    InstanceWrapper<Controller>
  >();
  private readonly _entryProviderKeys = new Set<InstanceToken>();
  private readonly _exports = new Set<InstanceToken>();

  private _distance = 0;
  private _initOnPreview = false;
  private _isGlobal = false;
  private _token: string;

  constructor(
    private readonly _metatype: Type<any>,
    private readonly container: NestContainer,
  ) {
    this.addCoreProviders();
    this._id = this.generateUuid();
  }

  get id(): string {
    return this._id;
  }

  get token(): string {
    return this._token;
  }

  set token(token: string) {
    this._token = token;
  }

  get name() {
    return this.metatype.name;
  }

  get isGlobal() {
    return this._isGlobal;
  }

  set isGlobal(global: boolean) {
    this._isGlobal = global;
  }

  get initOnPreview() {
    return this._initOnPreview;
  }

  set initOnPreview(initOnPreview: boolean) {
    this._initOnPreview = initOnPreview;
  }

  get providers(): Map<InstanceToken, InstanceWrapper<Injectable>> {
    return this._providers;
  }

  get middlewares(): Map<InstanceToken, InstanceWrapper<Injectable>> {
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
  get components(): Map<InstanceToken, InstanceWrapper<Injectable>> {
    return this._providers;
  }

  /**
   * Left for backward-compatibility reasons
   */
  get routes(): Map<InstanceToken, InstanceWrapper<Controller>> {
    return this._controllers;
  }

  get injectables(): Map<InstanceToken, InstanceWrapper<Injectable>> {
    return this._injectables;
  }

  get controllers(): Map<InstanceToken, InstanceWrapper<Controller>> {
    return this._controllers;
  }

  get entryProviders(): Array<InstanceWrapper<Injectable>> {
    return Array.from(this._entryProviderKeys).map(token =>
      this.providers.get(token),
    );
  }

  get exports(): Set<InstanceToken> {
    return this._exports;
  }

  get instance(): NestModule {
    if (!this._providers.has(this._metatype)) {
      throw new RuntimeException();
    }
    const module = this._providers.get(this._metatype);
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
      ModuleRef,
      new InstanceWrapper({
        token: ModuleRef,
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
      this._metatype,
      new InstanceWrapper({
        token: this._metatype,
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
      ApplicationConfig,
      new InstanceWrapper({
        token: ApplicationConfig,
        name: ApplicationConfig.name,
        isResolved: true,
        instance: this.container.applicationConfig,
        host: this,
      }),
    );
  }

  public addInjectable<T extends Injectable>(
    injectable: Provider,
    enhancerSubtype: EnhancerSubtype,
    host?: Type<T>,
  ) {
    if (this.isCustomProvider(injectable)) {
      return this.addCustomProvider(
        injectable,
        this._injectables,
        enhancerSubtype,
      );
    }
    let instanceWrapper = this.injectables.get(injectable);
    if (!instanceWrapper) {
      instanceWrapper = new InstanceWrapper({
        token: injectable,
        name: injectable.name,
        metatype: injectable,
        instance: null,
        isResolved: false,
        scope: getClassScope(injectable),
        durable: isDurable(injectable),
        subtype: enhancerSubtype,
        host: this,
      });
      this._injectables.set(injectable, instanceWrapper);
    }
    if (host) {
      const hostWrapper =
        this._controllers.get(host) || this._providers.get(host);
      hostWrapper && hostWrapper.addEnhancerMetadata(instanceWrapper);
    }
    return instanceWrapper;
  }

  public addProvider(provider: Provider): Provider | InjectionToken;
  public addProvider(
    provider: Provider,
    enhancerSubtype: EnhancerSubtype,
  ): Provider | InjectionToken;
  public addProvider(provider: Provider, enhancerSubtype?: EnhancerSubtype) {
    if (this.isCustomProvider(provider)) {
      if (this.isEntryProvider(provider.provide)) {
        this._entryProviderKeys.add(provider.provide);
      }
      return this.addCustomProvider(provider, this._providers, enhancerSubtype);
    }

    this._providers.set(
      provider,
      new InstanceWrapper({
        token: provider,
        name: (provider as Type<Injectable>).name,
        metatype: provider as Type<Injectable>,
        instance: null,
        isResolved: false,
        scope: getClassScope(provider),
        durable: isDurable(provider),
        host: this,
      }),
    );

    if (this.isEntryProvider(provider)) {
      this._entryProviderKeys.add(provider);
    }

    return provider as Type<Injectable>;
  }

  public isCustomProvider(
    provider: Provider,
  ): provider is
    | ClassProvider
    | FactoryProvider
    | ValueProvider
    | ExistingProvider {
    return !isNil(
      (
        provider as
          | ClassProvider
          | FactoryProvider
          | ValueProvider
          | ExistingProvider
      ).provide,
    );
  }

  public addCustomProvider(
    provider:
      | ClassProvider
      | FactoryProvider
      | ValueProvider
      | ExistingProvider,
    collection: Map<Function | string | symbol, any>,
    enhancerSubtype?: EnhancerSubtype,
  ) {
    if (this.isCustomClass(provider)) {
      this.addCustomClass(provider, collection, enhancerSubtype);
    } else if (this.isCustomValue(provider)) {
      this.addCustomValue(provider, collection, enhancerSubtype);
    } else if (this.isCustomFactory(provider)) {
      this.addCustomFactory(provider, collection, enhancerSubtype);
    } else if (this.isCustomUseExisting(provider)) {
      this.addCustomUseExisting(provider, collection, enhancerSubtype);
    }
    return provider.provide;
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
    provider: ClassProvider,
    collection: Map<InstanceToken, InstanceWrapper>,
    enhancerSubtype?: EnhancerSubtype,
  ) {
    let { scope, durable } = provider;

    const { useClass } = provider;
    if (isUndefined(scope)) {
      scope = getClassScope(useClass);
    }
    if (isUndefined(durable)) {
      durable = isDurable(useClass);
    }

    const token = provider.provide;
    collection.set(
      token,
      new InstanceWrapper({
        token,
        name: useClass?.name || useClass,
        metatype: useClass,
        instance: null,
        isResolved: false,
        scope,
        durable,
        host: this,
        subtype: enhancerSubtype,
      }),
    );
  }

  public addCustomValue(
    provider: ValueProvider,
    collection: Map<Function | string | symbol, InstanceWrapper>,
    enhancerSubtype?: EnhancerSubtype,
  ) {
    const { useValue: value, provide: providerToken } = provider;
    collection.set(
      providerToken,
      new InstanceWrapper({
        token: providerToken,
        name: (providerToken as Function)?.name || providerToken,
        metatype: null,
        instance: value,
        isResolved: true,
        async: value instanceof Promise,
        host: this,
        subtype: enhancerSubtype,
      }),
    );
  }

  public addCustomFactory(
    provider: FactoryProvider,
    collection: Map<Function | string | symbol, InstanceWrapper>,
    enhancerSubtype?: EnhancerSubtype,
  ) {
    const {
      useFactory: factory,
      inject,
      scope,
      durable,
      provide: providerToken,
    } = provider;

    collection.set(
      providerToken,
      new InstanceWrapper({
        token: providerToken,
        name: (providerToken as Function)?.name || providerToken,
        metatype: factory as any,
        instance: null,
        isResolved: false,
        inject: inject || [],
        scope,
        durable,
        host: this,
        subtype: enhancerSubtype,
      }),
    );
  }

  public addCustomUseExisting(
    provider: ExistingProvider,
    collection: Map<Function | string | symbol, InstanceWrapper>,
    enhancerSubtype?: EnhancerSubtype,
  ) {
    const { useExisting, provide: providerToken } = provider;
    collection.set(
      providerToken,
      new InstanceWrapper({
        token: providerToken,
        name: (providerToken as Function)?.name || providerToken,
        metatype: (instance => instance) as any,
        instance: null,
        isResolved: false,
        inject: [useExisting],
        host: this,
        isAlias: true,
        subtype: enhancerSubtype,
      }),
    );
  }

  public addExportedProvider(
    provider: Provider | string | symbol | DynamicModule,
  ) {
    const addExportedUnit = (token: InstanceToken) =>
      this._exports.add(this.validateExportedProvider(token));

    if (this.isCustomProvider(provider as any)) {
      return this.addCustomExportedProvider(provider as any);
    } else if (isString(provider) || isSymbol(provider)) {
      return addExportedUnit(provider);
    } else if (this.isDynamicModule(provider)) {
      const { module: moduleClassRef } = provider;
      return addExportedUnit(moduleClassRef);
    }
    addExportedUnit(provider as Type<any>);
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
    this._exports.add(this.validateExportedProvider(provide));
  }

  public validateExportedProvider(token: InstanceToken) {
    if (this._providers.has(token)) {
      return token;
    }
    const imports = iterate(this._imports.values())
      .filter(item => !!item)
      .map(({ metatype }) => metatype)
      .filter(metatype => !!metatype)
      .toArray();

    if (!imports.includes(token as Type<unknown>)) {
      const { name } = this.metatype;
      const providerName = isFunction(token) ? (token as Function).name : token;
      throw new UnknownExportException(providerName as string, name);
    }
    return token;
  }

  public addController(controller: Type<Controller>) {
    this._controllers.set(
      controller,
      new InstanceWrapper({
        token: controller,
        name: controller.name,
        metatype: controller,
        instance: null,
        isResolved: false,
        scope: getClassScope(controller),
        durable: isDurable(controller),
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

  public replace(toReplace: InstanceToken, options: any) {
    if (options.isProvider && this.hasProvider(toReplace)) {
      const originalProvider = this._providers.get(toReplace);

      return originalProvider.mergeWith({ provide: toReplace, ...options });
    } else if (!options.isProvider && this.hasInjectable(toReplace)) {
      const originalInjectable = this._injectables.get(toReplace);

      return originalInjectable.mergeWith({
        provide: toReplace,
        ...options,
      });
    }
  }

  public hasProvider(token: InstanceToken): boolean {
    return this._providers.has(token);
  }

  public hasInjectable(token: InstanceToken): boolean {
    return this._injectables.has(token);
  }

  public getProviderByKey<T = any>(name: InstanceToken): InstanceWrapper<T> {
    return this._providers.get(name) as InstanceWrapper<T>;
  }

  public getProviderById<T = any>(id: string): InstanceWrapper<T> | undefined {
    return Array.from(this._providers.values()).find(
      item => item.id === id,
    ) as InstanceWrapper<T>;
  }

  public getControllerById<T = any>(
    id: string,
  ): InstanceWrapper<T> | undefined {
    return Array.from(this._controllers.values()).find(
      item => item.id === id,
    ) as InstanceWrapper<T>;
  }

  public getInjectableById<T = any>(
    id: string,
  ): InstanceWrapper<T> | undefined {
    return Array.from(this._injectables.values()).find(
      item => item.id === id,
    ) as InstanceWrapper<T>;
  }

  public getMiddlewareById<T = any>(
    id: string,
  ): InstanceWrapper<T> | undefined {
    return Array.from(this._middlewares.values()).find(
      item => item.id === id,
    ) as InstanceWrapper<T>;
  }

  public getNonAliasProviders(): Array<
    [InstanceToken, InstanceWrapper<Injectable>]
  > {
    return [...this._providers].filter(([_, wrapper]) => !wrapper.isAlias);
  }

  public createModuleReferenceType(): Type<ModuleRef> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return class extends ModuleRef {
      constructor() {
        super(self.container);
      }

      public get<TInput = any, TResult = TInput>(
        typeOrToken: Type<TInput> | string | symbol,
        options: ModuleRefGetOrResolveOpts = {},
      ): TResult | Array<TResult> {
        options.strict ??= true;
        options.each ??= false;

        return this.find<TInput, TResult>(
          typeOrToken,
          options.strict
            ? {
                moduleId: self.id,
                each: options.each,
              }
            : options,
        );
      }

      public resolve<TInput = any, TResult = TInput>(
        typeOrToken: Type<TInput> | string | symbol,
        contextId = createContextId(),
        options: ModuleRefGetOrResolveOpts = {},
      ): Promise<TResult | Array<TResult>> {
        options.strict ??= true;
        options.each ??= false;

        return this.resolvePerContext<TInput, TResult>(
          typeOrToken,
          self,
          contextId,
          options,
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

  private isEntryProvider(metatype: InjectionToken): boolean {
    return typeof metatype === 'function'
      ? !!Reflect.getMetadata(ENTRY_PROVIDER_WATERMARK, metatype)
      : false;
  }

  private generateUuid(): string {
    const prefix = 'M_';
    const key = this.name?.toString() ?? this.token?.toString();
    return key ? UuidFactory.get(`${prefix}_${key}`) : randomStringGenerator();
  }
}
