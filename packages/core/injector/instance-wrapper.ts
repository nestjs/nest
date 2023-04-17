import { Logger, LoggerService, Provider, Scope, Type } from '@nestjs/common';
import { EnhancerSubtype } from '@nestjs/common/constants';
import { FactoryProvider, InjectionToken } from '@nestjs/common/interfaces';
import { clc } from '@nestjs/common/utils/cli-colors.util';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import {
  isNil,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import { UuidFactory } from '../inspector/uuid-factory';
import { STATIC_CONTEXT } from './constants';
import {
  isClassProvider,
  isFactoryProvider,
  isValueProvider,
} from './helpers/provider-classifier';
import { Module } from './module';

export const INSTANCE_METADATA_SYMBOL = Symbol.for('instance_metadata:cache');
export const INSTANCE_ID_SYMBOL = Symbol.for('instance_metadata:id');

export interface HostComponentInfo {
  /**
   * Injection token (or class reference)
   */
  token: InjectionToken;
  /**
   * Flag that indicates whether DI subtree is durable
   */
  isTreeDurable: boolean;
}

export interface ContextId {
  readonly id: number;
  payload?: unknown;
  getParent?(info: HostComponentInfo): ContextId;
}

export interface InstancePerContext<T> {
  instance: T;
  isResolved?: boolean;
  isPending?: boolean;
  donePromise?: Promise<unknown>;
}

export interface PropertyMetadata {
  key: symbol | string;
  wrapper: InstanceWrapper;
}

interface InstanceMetadataStore {
  dependencies?: InstanceWrapper[];
  properties?: PropertyMetadata[];
  enhancers?: InstanceWrapper[];
}

export class InstanceWrapper<T = any> {
  public readonly name: any;
  public readonly token: InjectionToken;
  public readonly async?: boolean;
  public readonly host?: Module;
  public readonly isAlias: boolean = false;
  public readonly subtype?: EnhancerSubtype;

  public scope?: Scope = Scope.DEFAULT;
  public metatype: Type<T> | Function;
  public inject?: FactoryProvider['inject'];
  public forwardRef?: boolean;
  public durable?: boolean;
  public initTime?: number;

  private static logger: LoggerService = new Logger(InstanceWrapper.name);

  private readonly values = new WeakMap<ContextId, InstancePerContext<T>>();
  private readonly [INSTANCE_METADATA_SYMBOL]: InstanceMetadataStore = {};
  private readonly [INSTANCE_ID_SYMBOL]: string;
  private transientMap?:
    | Map<string, WeakMap<ContextId, InstancePerContext<T>>>
    | undefined;
  private isTreeStatic: boolean | undefined;
  private isTreeDurable: boolean | undefined;

  constructor(
    metadata: Partial<InstanceWrapper<T>> & Partial<InstancePerContext<T>> = {},
  ) {
    this.initialize(metadata);
    this[INSTANCE_ID_SYMBOL] =
      metadata[INSTANCE_ID_SYMBOL] ?? this.generateUuid();
  }

  get id(): string {
    return this[INSTANCE_ID_SYMBOL];
  }

  set instance(value: T) {
    this.values.set(STATIC_CONTEXT, { instance: value });
  }

  get instance(): T {
    const instancePerContext = this.getInstanceByContextId(STATIC_CONTEXT);
    return instancePerContext.instance;
  }

  get isNotMetatype(): boolean {
    const isFactory = this.metatype && !isNil(this.inject);
    return !this.metatype || isFactory;
  }

  get isTransient(): boolean {
    return this.scope === Scope.TRANSIENT;
  }

  public getInstanceByContextId(
    contextId: ContextId,
    inquirerId?: string,
  ): InstancePerContext<T> {
    if (this.scope === Scope.TRANSIENT && inquirerId) {
      return this.getInstanceByInquirerId(contextId, inquirerId);
    }
    const instancePerContext = this.values.get(contextId);
    return instancePerContext
      ? instancePerContext
      : this.cloneStaticInstance(contextId);
  }

  public getInstanceByInquirerId(
    contextId: ContextId,
    inquirerId: string,
  ): InstancePerContext<T> {
    let collectionPerContext = this.transientMap.get(inquirerId);
    if (!collectionPerContext) {
      collectionPerContext = new WeakMap();
      this.transientMap.set(inquirerId, collectionPerContext);
    }
    const instancePerContext = collectionPerContext.get(contextId);
    return instancePerContext
      ? instancePerContext
      : this.cloneTransientInstance(contextId, inquirerId);
  }

  public setInstanceByContextId(
    contextId: ContextId,
    value: InstancePerContext<T>,
    inquirerId?: string,
  ) {
    if (this.scope === Scope.TRANSIENT && inquirerId) {
      return this.setInstanceByInquirerId(contextId, inquirerId, value);
    }
    this.values.set(contextId, value);
  }

  public setInstanceByInquirerId(
    contextId: ContextId,
    inquirerId: string,
    value: InstancePerContext<T>,
  ) {
    let collection = this.transientMap.get(inquirerId);
    if (!collection) {
      collection = new WeakMap();
      this.transientMap.set(inquirerId, collection);
    }
    collection.set(contextId, value);
  }

  public addCtorMetadata(index: number, wrapper: InstanceWrapper) {
    if (!this[INSTANCE_METADATA_SYMBOL].dependencies) {
      this[INSTANCE_METADATA_SYMBOL].dependencies = [];
    }
    this[INSTANCE_METADATA_SYMBOL].dependencies[index] = wrapper;
  }

  public getCtorMetadata(): InstanceWrapper[] {
    return this[INSTANCE_METADATA_SYMBOL].dependencies;
  }

  public addPropertiesMetadata(key: symbol | string, wrapper: InstanceWrapper) {
    if (!this[INSTANCE_METADATA_SYMBOL].properties) {
      this[INSTANCE_METADATA_SYMBOL].properties = [];
    }
    this[INSTANCE_METADATA_SYMBOL].properties.push({
      key,
      wrapper,
    });
  }

  public getPropertiesMetadata(): PropertyMetadata[] {
    return this[INSTANCE_METADATA_SYMBOL].properties;
  }

  public addEnhancerMetadata(wrapper: InstanceWrapper) {
    if (!this[INSTANCE_METADATA_SYMBOL].enhancers) {
      this[INSTANCE_METADATA_SYMBOL].enhancers = [];
    }
    this[INSTANCE_METADATA_SYMBOL].enhancers.push(wrapper);
  }

  public getEnhancersMetadata(): InstanceWrapper[] {
    return this[INSTANCE_METADATA_SYMBOL].enhancers;
  }

  public isDependencyTreeDurable(lookupRegistry: string[] = []): boolean {
    if (!isUndefined(this.isTreeDurable)) {
      return this.isTreeDurable;
    }
    if (this.scope === Scope.REQUEST) {
      this.isTreeDurable = this.durable === undefined ? false : this.durable;
      if (this.isTreeDurable) {
        this.printIntrospectedAsDurable();
      }
      return this.isTreeDurable;
    }
    const isStatic = this.isDependencyTreeStatic();
    if (isStatic) {
      return false;
    }

    const isTreeNonDurable = this.introspectDepsAttribute(
      (collection, registry) =>
        collection.some(
          (item: InstanceWrapper) =>
            !item.isDependencyTreeStatic() &&
            !item.isDependencyTreeDurable(registry),
        ),
      lookupRegistry,
    );
    this.isTreeDurable = !isTreeNonDurable;
    if (this.isTreeDurable) {
      this.printIntrospectedAsDurable();
    }
    return this.isTreeDurable;
  }

  public introspectDepsAttribute(
    callback: (
      collection: InstanceWrapper[],
      lookupRegistry: string[],
    ) => boolean,
    lookupRegistry: string[] = [],
  ): boolean {
    if (lookupRegistry.includes(this[INSTANCE_ID_SYMBOL])) {
      return false;
    }
    lookupRegistry = lookupRegistry.concat(this[INSTANCE_ID_SYMBOL]);

    const { dependencies, properties, enhancers } =
      this[INSTANCE_METADATA_SYMBOL];

    let introspectionResult = dependencies
      ? callback(dependencies, lookupRegistry)
      : false;

    if (introspectionResult || !(properties || enhancers)) {
      return introspectionResult;
    }
    introspectionResult = properties
      ? callback(
          properties.map(item => item.wrapper),
          lookupRegistry,
        )
      : false;
    if (introspectionResult || !enhancers) {
      return introspectionResult;
    }
    return enhancers ? callback(enhancers, lookupRegistry) : false;
  }

  public isDependencyTreeStatic(lookupRegistry: string[] = []): boolean {
    if (!isUndefined(this.isTreeStatic)) {
      return this.isTreeStatic;
    }
    if (this.scope === Scope.REQUEST) {
      this.isTreeStatic = false;
      this.printIntrospectedAsRequestScoped();
      return this.isTreeStatic;
    }
    this.isTreeStatic = !this.introspectDepsAttribute(
      (collection, registry) =>
        collection.some(
          (item: InstanceWrapper) => !item.isDependencyTreeStatic(registry),
        ),
      lookupRegistry,
    );
    if (!this.isTreeStatic) {
      this.printIntrospectedAsRequestScoped();
    }
    return this.isTreeStatic;
  }

  public cloneStaticInstance(contextId: ContextId): InstancePerContext<T> {
    const staticInstance = this.getInstanceByContextId(STATIC_CONTEXT);
    if (this.isDependencyTreeStatic()) {
      return staticInstance;
    }
    const instancePerContext: InstancePerContext<T> = {
      ...staticInstance,
      instance: undefined,
      isResolved: false,
      isPending: false,
    };
    if (this.isNewable()) {
      instancePerContext.instance = Object.create(this.metatype.prototype);
    }
    this.setInstanceByContextId(contextId, instancePerContext);
    return instancePerContext;
  }

  public cloneTransientInstance(
    contextId: ContextId,
    inquirerId: string,
  ): InstancePerContext<T> {
    const staticInstance = this.getInstanceByContextId(STATIC_CONTEXT);
    const instancePerContext: InstancePerContext<T> = {
      ...staticInstance,
      instance: undefined,
      isResolved: false,
      isPending: false,
    };
    if (this.isNewable()) {
      instancePerContext.instance = Object.create(this.metatype.prototype);
    }
    this.setInstanceByInquirerId(contextId, inquirerId, instancePerContext);
    return instancePerContext;
  }

  public createPrototype(contextId: ContextId) {
    const host = this.getInstanceByContextId(contextId);
    if (!this.isNewable() || host.isResolved) {
      return;
    }
    return Object.create(this.metatype.prototype);
  }

  public isInRequestScope(
    contextId: ContextId,
    inquirer?: InstanceWrapper | undefined,
  ): boolean {
    const isDependencyTreeStatic = this.isDependencyTreeStatic();

    return (
      !isDependencyTreeStatic &&
      contextId !== STATIC_CONTEXT &&
      (!this.isTransient || (this.isTransient && !!inquirer))
    );
  }

  public isLazyTransient(
    contextId: ContextId,
    inquirer: InstanceWrapper | undefined,
  ): boolean {
    const isInquirerRequestScoped =
      inquirer && !inquirer.isDependencyTreeStatic();

    return (
      this.isDependencyTreeStatic() &&
      contextId !== STATIC_CONTEXT &&
      this.isTransient &&
      isInquirerRequestScoped
    );
  }

  public isExplicitlyRequested(
    contextId: ContextId,
    inquirer?: InstanceWrapper,
  ): boolean {
    const isSelfRequested = inquirer === this;
    return (
      this.isDependencyTreeStatic() &&
      contextId !== STATIC_CONTEXT &&
      (isSelfRequested || (inquirer && inquirer.scope === Scope.TRANSIENT))
    );
  }

  public isStatic(
    contextId: ContextId,
    inquirer: InstanceWrapper | undefined,
  ): boolean {
    const isInquirerRequestScoped =
      inquirer && !inquirer.isDependencyTreeStatic();
    const isStaticTransient = this.isTransient && !isInquirerRequestScoped;

    return (
      this.isDependencyTreeStatic() &&
      contextId === STATIC_CONTEXT &&
      (!this.isTransient ||
        (isStaticTransient && !!inquirer && !inquirer.isTransient))
    );
  }

  public getStaticTransientInstances() {
    if (!this.transientMap) {
      return [];
    }
    const instances = [...this.transientMap.values()];
    return iterate(instances)
      .map(item => item.get(STATIC_CONTEXT))
      .filter(item => !!item)
      .toArray();
  }

  public mergeWith(provider: Provider) {
    if (isValueProvider(provider)) {
      this.metatype = null;
      this.inject = null;

      this.scope = Scope.DEFAULT;

      this.setInstanceByContextId(STATIC_CONTEXT, {
        instance: provider.useValue,
        isResolved: true,
        isPending: false,
      });
    } else if (isClassProvider(provider)) {
      this.inject = null;
      this.metatype = provider.useClass;
    } else if (isFactoryProvider(provider)) {
      this.metatype = provider.useFactory;
      this.inject = provider.inject || [];
    }
  }

  private isNewable(): boolean {
    return isNil(this.inject) && this.metatype && this.metatype.prototype;
  }

  private initialize(
    metadata: Partial<InstanceWrapper<T>> & Partial<InstancePerContext<T>>,
  ) {
    const { instance, isResolved, ...wrapperPartial } = metadata;
    Object.assign(this, wrapperPartial);

    this.setInstanceByContextId(STATIC_CONTEXT, {
      instance,
      isResolved,
    });
    this.scope === Scope.TRANSIENT && (this.transientMap = new Map());
  }

  private printIntrospectedAsRequestScoped() {
    if (!this.isDebugMode() || this.name === 'REQUEST') {
      return;
    }
    if (isString(this.name)) {
      InstanceWrapper.logger.log(
        `${clc.cyanBright(this.name)}${clc.green(
          ' introspected as ',
        )}${clc.magentaBright('request-scoped')}`,
      );
    }
  }

  private printIntrospectedAsDurable() {
    if (!this.isDebugMode()) {
      return;
    }
    if (isString(this.name)) {
      InstanceWrapper.logger.log(
        `${clc.cyanBright(this.name)}${clc.green(
          ' introspected as ',
        )}${clc.magentaBright('durable')}`,
      );
    }
  }

  private isDebugMode(): boolean {
    return !!process.env.NEST_DEBUG;
  }

  private generateUuid(): string {
    let key = this.name?.toString() ?? this.token?.toString();
    key += this.host?.name ?? '';

    return key ? UuidFactory.get(key) : randomStringGenerator();
  }
}
