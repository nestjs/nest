import type { ForwardReference, Type } from '@nestjs/common';
import {
  type InjectionToken,
  Logger,
  type LoggerService,
  type OptionalFactoryDependency,
  Scope,
} from '@nestjs/common';
import {
  type Controller,
  type Injectable,
  OPTIONAL_DEPS_METADATA,
  OPTIONAL_PROPERTY_DEPS_METADATA,
  PARAMTYPES_METADATA,
  PROPERTY_DEPS_METADATA,
  SELF_DECLARED_DEPS_METADATA,
  clc,
  isFunction,
  isNil,
  isObject,
  isString,
  isSymbol,
  isUndefined,
} from '@nestjs/common/internal';
import { iterate } from 'iterare';
import { performance } from 'perf_hooks';
import { CircularDependencyException } from '../errors/exceptions/index.js';
import { RuntimeException } from '../errors/exceptions/runtime.exception.js';
import { UndefinedDependencyException } from '../errors/exceptions/undefined-dependency.exception.js';
import { UnknownDependenciesException } from '../errors/exceptions/unknown-dependencies.exception.js';
import { Barrier } from '../helpers/barrier.js';
import { makeSafeInstanceDecorator } from '../helpers/safe-instance-decorator.js';
import { STATIC_CONTEXT } from './constants.js';
import { isDebugMode } from './helpers/is-debug-mode.util.js';
import { INQUIRER } from './inquirer/index.js';
import {
  ContextId,
  InstancePerContext,
  InstanceWrapper,
  PropertyMetadata,
} from './instance-wrapper.js';
import { Module } from './module.js';
import { SettlementSignal } from './settlement-signal.js';

/**
 * The type of an injectable dependency
 */
export type InjectorDependency = InjectionToken;

/**
 * The property-based dependency
 */
export interface PropertyDependency {
  key: symbol | string;
  name: InjectorDependency;
  isOptional?: boolean;
  instance?: any;
}

/**
 * Context of a dependency which gets injected by
 * the injector
 */
export interface InjectorDependencyContext {
  /**
   * The name of the property key (property-based injection)
   */
  key?: string | symbol;
  /**
   * The function itself, the name of the function, or injection token.
   */
  name?: Function | string | symbol;
  /**
   * The index of the dependency which gets injected
   * from the dependencies array
   */
  index?: number;
  /**
   * The dependency array which gets injected
   */
  dependencies?: InjectorDependency[];
}

interface ResolutionContext {
  contextId: ContextId;
  inquirer?: InstanceWrapper;
  effectiveInquirerId?: string;
  /**
   * The root inquirer of a transient `inquirer` that has a parent inquirer.
   * It belongs to the resolution, not to the wrapper, as a transient provider
   * is resolved for all of its consumers concurrently.
   */
  rootInquirer?: InstanceWrapper;
}

/**
 * An edge to a dependency, which follows the signal of its load for one
 * context. The signal is read lazily, as the load creates it after the edge.
 */
class HostSettlementRef {
  constructor(
    public readonly id: string,
    private readonly host: InstancePerContext<unknown>,
  ) {}

  get settlementSignal() {
    return this.host.settlementSignal;
  }
}

export class Injector {
  private logger: LoggerService = new Logger('InjectorLogger');
  private readonly instanceDecorator: (target: unknown) => unknown = (
    target: unknown,
  ) => target;
  /**
   * Per-context loads that the provider which started them could not wait
   * for (see `resolveComponentHost`), awaited by `waitForDeferredLoads`.
   */
  private readonly deferredLoads = new WeakMap<
    ContextId,
    Set<Promise<unknown>>
  >();
  /**
   * Deferred loads that are still running, per durable dependent of the
   * provider being loaded and per context of that dependent (see
   * `trackDurableDeferredLoad`).
   */
  private readonly durableDeferredLoads = new WeakMap<
    InstanceWrapper,
    WeakMap<ContextId, Set<Promise<unknown>>>
  >();
  /**
   * Durable instances that may reference the placeholder of a provider whose
   * deferred load failed, with the error (see `trackDurableDeferredLoad`).
   */
  private readonly failedInstances = new WeakMap<
    InstancePerContext<unknown>,
    unknown
  >();

  constructor(
    private readonly options?: {
      /**
       * Whether to enable preview mode.
       */
      preview: boolean;
      /**
       * Whether to enable deterministic graph snapshot generation.
       */
      snapshot?: boolean;
      /**
       * Function to decorate a freshly created instance.
       */
      instanceDecorator?: (target: unknown) => unknown;
    },
  ) {
    if (options?.instanceDecorator) {
      this.instanceDecorator = makeSafeInstanceDecorator(
        options.instanceDecorator,
      );
    }
  }

  public loadPrototype<T>(
    { token }: InstanceWrapper<T>,
    collection: Map<InjectionToken, InstanceWrapper<T>>,
    contextId = STATIC_CONTEXT,
  ) {
    if (!collection) {
      return;
    }
    const target = collection.get(token)!;
    const instance = target.createPrototype(contextId);
    if (instance) {
      // Update the wrapper in place instead of replacing it with a copy, as
      // hosts (e.g., the classes its enhancers are bound to) keep a reference
      // to it and must be notified of the dependencies it gets later.
      target.setInstanceByContextId(contextId, { instance });
    }
  }

  public async loadInstance<T>(
    wrapper: InstanceWrapper<T>,
    collection: Map<InjectionToken, InstanceWrapper>,
    moduleRef: Module,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
  ) {
    const inquirerId = this.getContextInquirerId(resolutionContext);
    const hostContextId = this.getContextId(
      resolutionContext.contextId,
      wrapper,
    );
    const instanceHost = this.getInstanceHost(
      wrapper,
      hostContextId,
      inquirerId,
    );

    if (instanceHost.isPending) {
      const settlementSignal = instanceHost.settlementSignal;
      if (
        resolutionContext.inquirer &&
        settlementSignal?.isCycle(resolutionContext.inquirer.id)
      ) {
        throw new CircularDependencyException(`"${wrapper.name}"`);
      }

      return instanceHost.donePromise!.then((err?: unknown) => {
        if (err) {
          throw err;
        }
        if (this.failedInstances.has(instanceHost)) {
          throw this.failedInstances.get(instanceHost);
        }
        this.linkDurableDeferredLoads(
          wrapper,
          resolutionContext.contextId,
          hostContextId,
        );
      });
    }

    const settlementSignal = this.applySettlementSignal(instanceHost, wrapper);
    const token = wrapper.token || wrapper.name;

    const { inject } = wrapper;
    const targetWrapper = collection.get(token);
    if (isUndefined(targetWrapper)) {
      throw new RuntimeException();
    }
    if (instanceHost.isResolved) {
      return settlementSignal.complete();
    }
    try {
      const t0 = this.getNowTimestamp();
      const localResolutionContext = this.createResolutionContext(
        resolutionContext.contextId,
        wrapper,
        inquirerId,
      );
      const callback = async (instances: unknown[], depth = 0) => {
        const properties = await this.resolveProperties(
          wrapper,
          moduleRef,
          inject as InjectionToken[],
          localResolutionContext,
          resolutionContext.inquirer,
        );
        const instance = await this.instantiateClass(
          instances,
          wrapper,
          targetWrapper,
          wrapper.isTransient ? localResolutionContext : resolutionContext,
        );
        this.applyProperties(instance, properties);

        wrapper.hierarchyLevel = depth + 1;
        wrapper.initTime = this.getNowTimestamp() - t0;
        settlementSignal.complete();
      };
      await this.resolveConstructorParams<T>(
        wrapper,
        moduleRef,
        inject as InjectionToken[],
        callback,
        localResolutionContext,
        resolutionContext.inquirer,
      );
      if (!instanceHost.isResolved) {
        settlementSignal.complete();
      }
    } catch (err) {
      wrapper.removeInstanceByContextId(
        this.getContextId(resolutionContext.contextId, wrapper),
        inquirerId,
      );

      settlementSignal.error(err);
      throw err;
    }
  }

  public async loadMiddleware(
    wrapper: InstanceWrapper,
    collection: Map<InjectionToken, InstanceWrapper>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ) {
    const { metatype, token } = wrapper;
    const targetWrapper = collection.get(token)!;
    if (!isUndefined(targetWrapper.instance)) {
      return;
    }
    targetWrapper.instance = Object.create(metatype!.prototype);
    await this.loadInstance(
      wrapper,
      collection,
      moduleRef,
      this.createResolutionContext(contextId, inquirer || wrapper),
    );
  }

  public async loadController(
    wrapper: InstanceWrapper<Controller>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
  ) {
    const controllers = moduleRef.controllers;
    await this.loadInstance<Controller>(
      wrapper,
      controllers,
      moduleRef,
      this.createResolutionContext(contextId, wrapper),
    );
    if (wrapper.isDependencyTreeStatic()) {
      // A static controller never gets a per-request load, so its transient
      // enhancers must exist for the controller before the first request.
      return this.loadEnhancers(
        contextId,
        wrapper,
        wrapper.getEnhancersMetadata() || [],
      );
    }
    await this.loadEnhancersPerContext(wrapper, contextId, wrapper);
  }

  public async loadInjectable<T = any>(
    wrapper: InstanceWrapper<T>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ) {
    const injectables = moduleRef.injectables;
    await this.loadInstance<T>(
      wrapper,
      injectables,
      moduleRef,
      this.createResolutionContext(contextId, inquirer),
    );
  }

  public async loadProvider(
    wrapper: InstanceWrapper<Injectable>,
    moduleRef: Module,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
  ) {
    if (this.shouldSkipProviderLoading(wrapper, resolutionContext)) {
      if (!resolutionContext.inquirer) {
        await this.lookupSkippedProviderDependencies(wrapper, moduleRef);
      }
      return;
    }
    const providers = moduleRef.providers;
    await this.loadInstance<Injectable>(
      wrapper,
      providers,
      moduleRef,
      resolutionContext,
    );
    if (
      resolutionContext.contextId === STATIC_CONTEXT &&
      !resolutionContext.inquirer &&
      wrapper.isDependencyTreeStatic()
    ) {
      // A static provider that hosts handlers (e.g., an entry provider or a
      // gateway) never gets a per-request load either, so its transient
      // enhancers must exist for the provider before the first call.
      // Only its bootstrap load (no inquirer) waits for them, as they may depend
      // on a provider that is itself waiting for this one. The non-transient
      // ones are shared, and get loaded with the injectables of the module.
      const enhancers = wrapper.getEnhancersMetadata() || [];
      return this.loadEnhancers(
        STATIC_CONTEXT,
        wrapper,
        enhancers.filter(item => item.isTransient),
      );
    }
    await this.loadEnhancersPerContext(
      wrapper,
      resolutionContext.contextId,
      wrapper,
    );
  }

  public applySettlementSignal<T>(
    instancePerContext: InstancePerContext<T>,
    host: InstanceWrapper<T>,
  ) {
    const settlementSignal = new SettlementSignal();
    instancePerContext.donePromise = settlementSignal.asPromise();
    instancePerContext.isPending = true;
    instancePerContext.settlementSignal = settlementSignal;
    host.settlementSignal = settlementSignal;

    return settlementSignal;
  }

  public async resolveConstructorParams<T>(
    wrapper: InstanceWrapper<T>,
    moduleRef: Module,
    inject: InjectorDependency[] | undefined,
    callback: (args: unknown[], depth?: number) => void | Promise<void>,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
    parentInquirer?: InstanceWrapper,
  ) {
    const metadata = wrapper.getCtorMetadata();

    if (
      resolutionContext.contextId !== STATIC_CONTEXT &&
      this.hasDenseCtorMetadata(wrapper, inject, metadata)
    ) {
      const deps = await this.loadCtorMetadata(
        metadata,
        resolutionContext.contextId,
        resolutionContext.inquirer,
        parentInquirer,
      );
      return callback(deps);
    }

    const isFactoryProvider = !isNil(inject);
    const [dependencies, optionalDependenciesIds] = isFactoryProvider
      ? this.getFactoryProviderDependencies(wrapper)
      : this.getClassDependencies(wrapper);

    const paramBarrier = new Barrier(dependencies.length);
    let isResolved = true;
    let depth = 0;
    const resolveParam = async (param: unknown, index: number) => {
      try {
        if (this.isInquirer(param, parentInquirer)) {
          /*
           * Signal the barrier to make sure other dependencies do not get stuck waiting forever.
           */
          paramBarrier.signal();

          return parentInquirer && parentInquirer.instance;
        }
        if (resolutionContext.inquirer?.isTransient && parentInquirer) {
          // When `inquirer` is transient too, inherit the parent inquirer
          // This is required to ensure that transient providers are only resolved
          // when requested
          resolutionContext.rootInquirer = parentInquirer;
        }
        const nestedResolutionContext =
          this.getStaticTransientResolutionContext(
            resolutionContext,
            parentInquirer,
          );
        const paramWrapper = await this.resolveSingleParam<T>(
          wrapper,
          param as Type | string | symbol,
          { index, dependencies },
          moduleRef,
          nestedResolutionContext,
          index,
        );

        /*
         * Ensure that all instance wrappers are resolved at this point before we continue.
         * Otherwise the staticity of `wrapper`'s dependency tree may be evaluated incorrectly
         * and result in undefined / null injection.
         */
        await paramBarrier.signalAndWait();

        const effectiveResolutionContext = this.getEffectiveResolutionContext(
          paramWrapper,
          resolutionContext,
          parentInquirer,
        );
        const paramWrapperWithInstance = await this.resolveComponentHost(
          moduleRef,
          paramWrapper,
          effectiveResolutionContext,
        );

        if (paramWrapperWithInstance.hierarchyLevel > depth) {
          depth = paramWrapperWithInstance.hierarchyLevel;
        }

        const instanceHost = paramWrapperWithInstance.getInstanceByContextId(
          this.getContextId(
            effectiveResolutionContext.contextId,
            paramWrapperWithInstance,
          ),
          effectiveResolutionContext.effectiveInquirerId,
        );
        if (!instanceHost.isResolved && !paramWrapperWithInstance.forwardRef) {
          isResolved = false;
        }
        return instanceHost?.instance;
      } catch (err) {
        /*
         * Signal the barrier to make sure other dependencies do not get stuck waiting forever. We
         * do not care if this occurs after `Barrier.signalAndWait()` is called in the `try` block
         * because the barrier will always have been resolved by then.
         */
        paramBarrier.signal();

        const isOptional = optionalDependenciesIds.includes(index);
        if (!isOptional) {
          throw err;
        }
        return undefined;
      }
    };
    const instances = await Promise.all(dependencies.map(resolveParam));
    isResolved && (await callback(instances, depth));
  }

  public getClassDependencies<T>(
    wrapper: InstanceWrapper<T>,
  ): [InjectorDependency[], number[]] {
    const ctorRef = wrapper.metatype as Type<any>;
    return [
      this.reflectConstructorParams(ctorRef),
      this.reflectOptionalParams(ctorRef),
    ];
  }

  public getFactoryProviderDependencies<T>(
    wrapper: InstanceWrapper<T>,
  ): [InjectorDependency[], number[]] {
    const optionalDependenciesIds: number[] = [];

    /**
     * Same as the internal utility function `isOptionalFactoryDependency` from `@nestjs/common`.
     * We are duplicating it here because that one is not supposed to be exported.
     */
    function isOptionalFactoryDependency(
      value: InjectionToken | OptionalFactoryDependency,
    ): value is OptionalFactoryDependency {
      const token = (value as OptionalFactoryDependency)?.token;
      if (isNil(token)) {
        return false;
      }
      return (
        !isUndefined((value as OptionalFactoryDependency).optional) &&
        !(value as any).prototype
      );
    }

    const mapFactoryProviderInjectArray = (
      item: InjectionToken | OptionalFactoryDependency,
      index: number,
    ): InjectionToken => {
      const isWrappedDependency =
        !isNil(item) && typeof item === 'object' && 'token' in item;
      const token = isWrappedDependency
        ? (item as OptionalFactoryDependency).token
        : item;

      if (isNil(token)) {
        throw new UndefinedDependencyException(wrapper.name, {
          index,
          dependencies: (wrapper.inject ?? undefined) as
            InjectorDependency[] | undefined,
        });
      }
      if (typeof item !== 'object') {
        return item;
      }
      if (isOptionalFactoryDependency(item)) {
        if (item.optional) {
          optionalDependenciesIds.push(index);
        }
        return item?.token;
      }
      return item;
    };
    const inject = wrapper.inject ?? [];
    const dependencies = Array.from(inject, mapFactoryProviderInjectArray);
    return [dependencies, optionalDependenciesIds];
  }

  public reflectConstructorParams(type: Type<unknown> | Function): any[] {
    const paramtypes = [
      ...(Reflect.getMetadata(PARAMTYPES_METADATA, type) || []),
    ];
    const selfParams = this.reflectSelfParams(type);

    selfParams.forEach(({ index, param }) => (paramtypes[index] = param));
    return Array.from(paramtypes);
  }

  public reflectOptionalParams(type: Type<unknown> | Function): any[] {
    const ctorOwner = this.getConstructorOwner(type);
    return Reflect.getOwnMetadata(OPTIONAL_DEPS_METADATA, ctorOwner) || [];
  }

  /**
   * Returns the class in the prototype chain that declares the constructor
   * `type` is instantiated with. A subclass without its own constructor
   * inherits both the parent's parameter types and its `@Optional()` flags,
   * while a subclass that redeclares the constructor must not inherit the
   * parent's flags, as its parameters are unrelated to the parent's.
   */
  private getConstructorOwner(
    type: Type<unknown> | Function,
  ): Type<unknown> | Function {
    let current: Type<unknown> | Function | null = type;
    while (isFunction(current) && current !== Function.prototype) {
      if (
        Reflect.hasOwnMetadata(PARAMTYPES_METADATA, current) ||
        Reflect.hasOwnMetadata(OPTIONAL_DEPS_METADATA, current) ||
        Reflect.hasOwnMetadata(SELF_DECLARED_DEPS_METADATA, current)
      ) {
        return current;
      }
      current = Object.getPrototypeOf(current);
    }
    return type;
  }

  public reflectSelfParams(type: Type<unknown> | Function): any[] {
    return Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, type) || [];
  }

  public async resolveSingleParam<T>(
    wrapper: InstanceWrapper<T>,
    param: Type<any> | string | symbol,
    dependencyContext: InjectorDependencyContext,
    moduleRef: Module,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
    keyOrIndex?: symbol | string | number,
  ) {
    if (isUndefined(param)) {
      this.logger.log(
        'Nest encountered an undefined dependency. This may be due to a circular import or a missing dependency declaration.',
      );
      throw new UndefinedDependencyException(
        wrapper.name,
        dependencyContext,
        moduleRef,
      );
    }
    const token = this.resolveParamToken(wrapper, param);
    return this.resolveComponentWrapper(
      moduleRef,
      token,
      dependencyContext,
      wrapper,
      resolutionContext,
      keyOrIndex,
    );
  }

  public resolveParamToken<T>(
    wrapper: InstanceWrapper<T>,
    param: Type<any> | string | symbol | ForwardReference,
  ) {
    if (typeof param === 'object' && 'forwardRef' in param) {
      wrapper.forwardRef = true;
      return param.forwardRef();
    }
    return param;
  }

  public async resolveComponentWrapper<T>(
    moduleRef: Module,
    token: InjectionToken,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
    keyOrIndex?: symbol | string | number,
  ): Promise<InstanceWrapper> {
    this.printResolvingDependenciesLog(token, resolutionContext.inquirer);
    this.printLookingForProviderLog(token, moduleRef);
    const providers = moduleRef.providers;
    return this.lookupComponent(
      providers,
      moduleRef,
      { ...dependencyContext, name: token },
      wrapper,
      resolutionContext,
      keyOrIndex,
    );
  }

  public async resolveComponentHost<T>(
    moduleRef: Module,
    instanceWrapper: InstanceWrapper<T | Promise<T>>,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
  ): Promise<InstanceWrapper> {
    const inquirerId = this.getContextInquirerId(resolutionContext);
    const instanceHost = this.getInstanceHost(
      instanceWrapper,
      this.getContextId(resolutionContext.contextId, instanceWrapper),
      inquirerId,
    );
    if (!instanceHost.isResolved && !instanceWrapper.forwardRef) {
      this.insertSettlementRef(
        resolutionContext,
        instanceWrapper,
        instanceHost,
      );

      await this.loadProvider(
        instanceWrapper,
        instanceWrapper.host ?? moduleRef,
        resolutionContext,
      );
    } else if (
      !instanceHost.isResolved &&
      instanceWrapper.forwardRef &&
      (resolutionContext.contextId !== STATIC_CONTEXT || !!inquirerId)
    ) {
      /**
       * When circular dependency has been detected between
       * either request/transient providers, we have to asynchronously
       * resolve instance host for a specific contextId or inquirer, to ensure
       * that eventual lazily created instance will be merged with the prototype
       * instantiated beforehand.
       */
      if (instanceHost.donePromise) {
        const deferredLoad = instanceHost.donePromise.then((err?: unknown) => {
          // The placeholder handed out belongs to the load that failed
          if (err) {
            throw err;
          }
          return this.loadProvider(
            instanceWrapper,
            instanceWrapper.host ?? moduleRef,
            resolutionContext,
          );
        });
        void deferredLoad.catch(err => {
          instanceHost.settlementSignal?.error(err);
        });
        this.addDeferredLoad(resolutionContext.contextId, deferredLoad);
        this.trackDurableDeferredLoad(
          instanceWrapper,
          resolutionContext.contextId,
          deferredLoad,
        );
      } else {
        /**
         * No load has ever been scheduled for this context (e.g., request-scoped
         * providers are no longer instantiated during static bootstrap, so a fresh
         * durable/request sub-tree host has no inherited `donePromise`).
         * Record the edge before loading it, so that if this load reaches the
         * inquirer while it is still pending, `isCycle()` sees the cycle and throws
         * instead of awaiting a `donePromise` that depends on itself.
         */
        this.insertSettlementRef(
          resolutionContext,
          instanceWrapper,
          instanceHost,
        );

        await this.loadProvider(
          instanceWrapper,
          instanceWrapper.host ?? moduleRef,
          resolutionContext,
        );
      }
    }
    if (instanceWrapper.async) {
      const host = instanceWrapper.getInstanceByContextId(
        this.getContextId(resolutionContext.contextId, instanceWrapper),
        inquirerId,
      );
      host.instance = await host.instance;
      instanceWrapper.setInstanceByContextId(
        resolutionContext.contextId,
        host,
        inquirerId,
      );
    }
    this.linkDurableDeferredLoads(
      instanceWrapper,
      resolutionContext.contextId,
      this.getContextId(resolutionContext.contextId, instanceWrapper),
    );
    return instanceWrapper;
  }

  public async lookupComponent<T = any>(
    providers: Map<Function | string | symbol, InstanceWrapper>,
    moduleRef: Module,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
    keyOrIndex?: symbol | string | number,
  ): Promise<InstanceWrapper<T>> {
    const token = wrapper.token || wrapper.name;
    const { name } = dependencyContext;
    if (wrapper && token === name) {
      throw new UnknownDependenciesException(
        wrapper.name,
        dependencyContext,
        moduleRef,
        { id: wrapper.id },
      );
    }
    if (name && providers.has(name)) {
      const instanceWrapper = providers.get(name)!;
      this.printFoundInModuleLog(name, moduleRef);
      this.addDependencyMetadata(keyOrIndex!, wrapper, instanceWrapper);
      return instanceWrapper;
    }
    return this.lookupComponentInParentModules(
      dependencyContext,
      moduleRef,
      wrapper,
      resolutionContext,
      keyOrIndex,
    );
  }

  public async lookupComponentInParentModules<T = any>(
    dependencyContext: InjectorDependencyContext,
    moduleRef: Module,
    wrapper: InstanceWrapper<T>,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
    keyOrIndex?: symbol | string | number,
  ) {
    const instanceWrapper = await this.lookupComponentInImports(
      moduleRef,
      dependencyContext.name!,
      wrapper,
      new Set<string>(),
      resolutionContext,
      keyOrIndex,
    );
    if (isNil(instanceWrapper)) {
      throw new UnknownDependenciesException(
        wrapper.name,
        dependencyContext,
        moduleRef,
        { id: wrapper.id },
      );
    }
    return instanceWrapper;
  }

  public async lookupComponentInImports(
    moduleRef: Module,
    name: InjectionToken,
    wrapper: InstanceWrapper,
    moduleRegistry: Set<string> = new Set<string>(),
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
    keyOrIndex?: symbol | string | number,
    isTraversing?: boolean,
  ): Promise<any> {
    let instanceWrapperRef: InstanceWrapper | null = null;
    const imports = moduleRef.imports || new Set<Module>();
    const identity = (item: any) => item;

    let children = [...imports.values()].filter(identity);
    if (isTraversing) {
      const contextModuleExports = moduleRef.exports;
      children = children.filter(child =>
        contextModuleExports.has(child.metatype),
      );
    }
    for (const relatedModule of children) {
      if (moduleRegistry.has(relatedModule.id)) {
        continue;
      }
      this.printLookingForProviderLog(name, relatedModule);
      moduleRegistry.add(relatedModule.id);

      const { providers, exports } = relatedModule;
      if (!exports.has(name) || !providers.has(name)) {
        const instanceRef = await this.lookupComponentInImports(
          relatedModule,
          name,
          wrapper,
          moduleRegistry,
          resolutionContext,
          keyOrIndex,
          true,
        );
        if (instanceRef) {
          this.addDependencyMetadata(keyOrIndex!, wrapper, instanceRef);
          return instanceRef;
        }
        continue;
      }
      this.printFoundInModuleLog(name, relatedModule);
      instanceWrapperRef = providers.get(name)!;
      this.addDependencyMetadata(keyOrIndex!, wrapper, instanceWrapperRef);

      /*
       * Stop at the first direct export match. Continuing when the provider is
       * already resolved would let a later import (e.g. a global forRoot module)
       * override an explicit forFeature import for the same token.
       */
      break;
    }
    return instanceWrapperRef;
  }

  public async resolveProperties<T>(
    wrapper: InstanceWrapper<T>,
    moduleRef: Module,
    inject?: InjectorDependency[],
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
    parentInquirer?: InstanceWrapper,
  ): Promise<PropertyDependency[]> {
    if (!isNil(inject)) {
      return [];
    }
    const metadata = wrapper.getPropertiesMetadata();
    if (
      resolutionContext.contextId !== STATIC_CONTEXT &&
      this.hasCompletePropertiesMetadata(wrapper, metadata)
    ) {
      return this.loadPropertiesMetadata(
        metadata,
        resolutionContext.contextId,
        resolutionContext.inquirer,
        parentInquirer,
      );
    }
    const properties = this.reflectProperties(wrapper.metatype as Type<any>);
    const propertyBarrier = new Barrier(properties.length);
    const instances = await Promise.all(
      properties.map(async (item: PropertyDependency) => {
        try {
          const dependencyContext = {
            key: item.key,
            name: item.name as Function | string | symbol,
          };
          if (this.isInquirer(item.name, parentInquirer)) {
            /*
             * Signal the barrier to make sure other dependencies do not get stuck waiting forever.
             */
            propertyBarrier.signal();

            return parentInquirer && parentInquirer.instance;
          }
          const nestedResolutionContext =
            this.getStaticTransientResolutionContext(
              resolutionContext,
              parentInquirer,
            );
          const paramWrapper = await this.resolveSingleParam<T>(
            wrapper,
            item.name as string,
            dependencyContext,
            moduleRef,
            nestedResolutionContext,
            item.key,
          );

          /*
           * Ensure that all instance wrappers are resolved at this point before we continue.
           * Otherwise the staticity of `wrapper`'s dependency tree may be evaluated incorrectly
           * and result in undefined / null injection.
           */
          await propertyBarrier.signalAndWait();

          const effectivePropertyResolutionContext =
            this.getEffectiveResolutionContext(
              paramWrapper,
              resolutionContext,
              parentInquirer,
            );
          const paramWrapperWithInstance = await this.resolveComponentHost(
            moduleRef,
            paramWrapper,
            effectivePropertyResolutionContext,
          );
          if (!paramWrapperWithInstance) {
            return undefined;
          }
          const instanceHost = paramWrapperWithInstance.getInstanceByContextId(
            this.getContextId(
              effectivePropertyResolutionContext.contextId,
              paramWrapperWithInstance,
            ),
            effectivePropertyResolutionContext.effectiveInquirerId,
          );
          return instanceHost.instance;
        } catch (err) {
          /*
           * Signal the barrier to make sure other dependencies do not get stuck waiting forever. We
           * do not care if this occurs after `Barrier.signalAndWait()` is called in the `try` block
           * because the barrier will always have been resolved by then.
           */
          propertyBarrier.signal();

          if (!item.isOptional) {
            throw err;
          }
          return undefined;
        }
      }),
    );
    return properties.map((item: PropertyDependency, index: number) => ({
      ...item,
      instance: instances[index],
    }));
  }

  public reflectProperties<T>(type: Type<T>): PropertyDependency[] {
    const properties = Reflect.getMetadata(PROPERTY_DEPS_METADATA, type) || [];
    const optionalKeys: string[] =
      Reflect.getMetadata(OPTIONAL_PROPERTY_DEPS_METADATA, type) || [];

    return properties.map((item: any) => ({
      ...item,
      name: item.type,
      isOptional: optionalKeys.includes(item.key),
    }));
  }

  public applyProperties<T = any>(
    instance: T,
    properties: PropertyDependency[],
  ): void {
    if (!isObject(instance)) {
      return;
    }
    iterate(properties)
      .filter(item => !isNil(item.instance))
      .forEach(item => (instance[item.key] = item.instance));
  }

  public async instantiateClass<T = any>(
    instances: any[],
    wrapper: InstanceWrapper,
    targetMetatype: InstanceWrapper,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
  ): Promise<T> {
    const { metatype, inject } = wrapper;
    const inquirerId = this.getContextInquirerId(resolutionContext);
    const instanceHost = targetMetatype.getInstanceByContextId(
      this.getContextId(resolutionContext.contextId, targetMetatype),
      inquirerId,
    );
    const isInContext = this.isInContext(wrapper, resolutionContext);

    if (this.options?.preview && !wrapper.host?.initOnPreview) {
      instanceHost.isResolved = true;
      return instanceHost.instance;
    }

    if (isNil(inject) && isInContext) {
      instanceHost.instance = wrapper.forwardRef
        ? Object.assign(
            instanceHost.instance,
            new (metatype as Type<any>)(...instances),
          )
        : new (metatype as Type<any>)(...instances);

      instanceHost.instance = this.instanceDecorator(instanceHost.instance);
      instanceHost.isConstructorCalled = true;
    } else if (isInContext) {
      const factoryReturnValue = (targetMetatype.metatype as any as Function)(
        ...instances,
      );
      instanceHost.instance = await factoryReturnValue;
      instanceHost.instance = this.instanceDecorator(instanceHost.instance);
      instanceHost.isConstructorCalled = true;
    }
    instanceHost.isResolved = true;
    return instanceHost.instance;
  }

  public async loadPerContext<T = any>(
    instance: T,
    moduleRef: Module,
    collection: Map<InjectionToken, InstanceWrapper>,
    ctx: ContextId,
    wrapper?: InstanceWrapper,
  ): Promise<T> {
    if (!wrapper) {
      const injectionToken = (instance as any).constructor!;
      wrapper =
        collection.get(injectionToken) ??
        // A class provider registered under a token other than its class
        iterate(collection.values()).find(
          item => !item.isAlias && item.instance === instance,
        );
    } else {
      wrapper = collection.get(wrapper.token) ?? wrapper;
    }
    await this.loadInstance(
      wrapper!,
      collection,
      moduleRef,
      this.createResolutionContext(ctx, wrapper),
    );
    await this.loadEnhancersPerContext(wrapper!, ctx, wrapper);
    await this.waitForDeferredLoads(ctx);

    const host = wrapper!.getInstanceByContextId(
      this.getContextId(ctx, wrapper!),
      wrapper!.id,
    );
    return host && (host.instance as T);
  }

  /**
   * Waits for the loads deferred while resolving the given context (see
   * `resolveComponentHost`), including those that the durable instances it
   * uses were built with (see `trackDurableDeferredLoad`), and throws if one
   * of them failed. A failed load is kept, as instances of the context already
   * reference the provider that it failed to instantiate.
   */
  public async waitForDeferredLoads(contextId: ContextId) {
    const deferredLoads = this.deferredLoads.get(contextId);
    if (!deferredLoads) {
      return;
    }
    for (const deferredLoad of deferredLoads) {
      await deferredLoad;
      deferredLoads.delete(deferredLoad);
    }
  }

  public async loadEnhancersPerContext(
    wrapper: InstanceWrapper,
    ctx: ContextId,
    inquirer?: InstanceWrapper,
    enhancers: InstanceWrapper[] = wrapper.getEnhancersMetadata() || [],
  ) {
    if (ctx === STATIC_CONTEXT) {
      return;
    }
    await this.loadEnhancers(ctx, inquirer, enhancers);
  }

  private async loadEnhancers(
    ctx: ContextId,
    inquirer: InstanceWrapper | undefined,
    enhancers: InstanceWrapper[],
  ) {
    const loadEnhancer = (item: InstanceWrapper) => {
      const hostModule = item.host!;
      return this.loadInstance(
        item,
        hostModule.injectables,
        hostModule,
        this.createResolutionContext(ctx, inquirer),
      );
    };
    await Promise.all(enhancers.map(loadEnhancer));
  }

  public async loadCtorMetadata(
    metadata: InstanceWrapper<any>[],
    contextId: ContextId,
    inquirer?: InstanceWrapper,
    parentInquirer?: InstanceWrapper,
  ): Promise<any[]> {
    const hosts: Array<InstanceWrapper<any> | undefined> = await Promise.all(
      metadata.map(async item =>
        this.resolveScopedComponentHost(
          item,
          contextId,
          inquirer,
          parentInquirer,
        ),
      ),
    );
    return hosts.map((item, index) => {
      const dependency = metadata[index];
      const effectiveInquirerId = this.getEffectiveInquirerId(
        dependency,
        this.createResolutionContext(contextId, inquirer),
        parentInquirer,
      );

      return item?.getInstanceByContextId(
        this.getContextId(contextId, item),
        effectiveInquirerId,
      ).instance;
    });
  }

  public async loadPropertiesMetadata(
    metadata: PropertyMetadata[],
    contextId: ContextId,
    inquirer?: InstanceWrapper,
    parentInquirer?: InstanceWrapper,
  ): Promise<PropertyDependency[]> {
    const dependenciesHosts = await Promise.all(
      metadata.map(async ({ wrapper: item, key }) => ({
        key,
        host: await this.resolveScopedComponentHost(
          item,
          contextId,
          inquirer,
          parentInquirer,
        ),
      })),
    );
    return dependenciesHosts.map(({ key, host }, index) => {
      const effectiveInquirerId = this.getEffectiveInquirerId(
        metadata[index].wrapper,
        this.createResolutionContext(contextId, inquirer),
        parentInquirer,
      );

      return {
        key,
        name: key,
        instance: host?.getInstanceByContextId(
          this.getContextId(contextId, host),
          effectiveInquirerId,
        ).instance,
      };
    });
  }

  private addDeferredLoad(
    contextId: ContextId,
    deferredLoad: Promise<unknown>,
  ) {
    if (contextId === STATIC_CONTEXT) {
      return;
    }
    let deferredLoads = this.deferredLoads.get(contextId);
    if (!deferredLoads) {
      deferredLoads = new Set();
      this.deferredLoads.set(contextId, deferredLoads);
    }
    deferredLoads.add(deferredLoad);
  }

  /**
   * In a durable context (see `ContextIdStrategy`), the dependents built with
   * the placeholder of a provider whose load is deferred are shared with the
   * next contexts mapped to it, which do not wait for that load. Until it
   * settles, the contexts that use them wait for it as well (see
   * `linkDurableDeferredLoads`); if it fails, the contexts still waiting for
   * one of them fail, and the next one that uses them builds them again (see
   * `getInstanceHost`).
   */
  private trackDurableDeferredLoad(
    wrapper: InstanceWrapper,
    contextId: ContextId,
    deferredLoad: Promise<unknown>,
  ) {
    if (this.getContextId(contextId, wrapper) === contextId) {
      return;
    }
    const untrackers: Array<() => void> = [];
    this.forEachDurableDependent(wrapper, contextId, (dependent, hostId) => {
      const loadsPerContext =
        this.durableDeferredLoads.get(dependent) ?? new WeakMap();
      const loads = loadsPerContext.get(hostId) ?? new Set();
      loads.add(deferredLoad);
      loadsPerContext.set(hostId, loads);
      this.durableDeferredLoads.set(dependent, loadsPerContext);

      untrackers.push(() => {
        loads.delete(deferredLoad);
        if (loads.size === 0) {
          loadsPerContext.delete(hostId);
        }
      });
    });
    const untrack = () => untrackers.forEach(untrackLoad => untrackLoad());

    deferredLoad.then(untrack, (err: unknown) => {
      // Looked up again, as a context may have built another dependent with
      // the placeholder in the meantime
      this.forEachDurableDependent(wrapper, contextId, (dependent, hostId) =>
        dependent
          .getExistingInstancesByContextId(hostId)
          .filter(host => host.isResolved || host.isPending)
          .forEach(host => this.failedInstances.set(host, err)),
      );
      untrack();
    });
  }

  /**
   * Adds the running loads that the instance of the wrapper in a durable
   * context was built with (see `trackDurableDeferredLoad`) to the loads of
   * the given context.
   */
  private linkDurableDeferredLoads(
    wrapper: InstanceWrapper,
    contextId: ContextId,
    hostContextId: ContextId,
  ) {
    if (hostContextId === contextId) {
      return;
    }
    this.durableDeferredLoads
      .get(wrapper)
      ?.get(hostContextId)
      ?.forEach(deferredLoad => this.addDeferredLoad(contextId, deferredLoad));
  }

  private forEachDurableDependent(
    wrapper: InstanceWrapper,
    contextId: ContextId,
    callback: (dependent: InstanceWrapper, hostContextId: ContextId) => void,
  ) {
    for (const dependent of wrapper.getDependents()) {
      const hostContextId = this.getContextId(contextId, dependent);
      if (hostContextId !== contextId) {
        callback(dependent, hostContextId);
      }
    }
  }

  /**
   * Returns the instance of the wrapper for the given context, or a new one
   * when it was built with a provider whose deferred load failed (see
   * `trackDurableDeferredLoad`), so that it is built again.
   */
  private getInstanceHost<T>(
    wrapper: InstanceWrapper<T>,
    contextId: ContextId,
    inquirerId: string | undefined,
  ): InstancePerContext<T> {
    const instanceHost = wrapper.getInstanceByContextId(contextId, inquirerId);
    if (!instanceHost.isResolved || !this.failedInstances.has(instanceHost)) {
      return instanceHost;
    }
    wrapper.removeInstanceByContextId(contextId, inquirerId);
    return wrapper.getInstanceByContextId(contextId, inquirerId);
  }

  /**
   * Records that the load of the inquirer waits on the given host.
   */
  private insertSettlementRef(
    { contextId, inquirer }: ResolutionContext,
    wrapper: InstanceWrapper,
    instanceHost: InstancePerContext<unknown>,
  ) {
    const inquirerSignal = inquirer?.isTransient
      ? inquirer.settlementSignal
      : inquirer?.getInstanceByContextId(this.getContextId(contextId, inquirer))
          .settlementSignal;
    inquirerSignal?.insertRef(new HostSettlementRef(wrapper.id, instanceHost));
  }

  private getInquirerId(
    inquirer: InstanceWrapper | undefined,
  ): string | undefined {
    return inquirer ? inquirer.id : undefined;
  }

  private createResolutionContext(
    contextId: ContextId,
    inquirer?: InstanceWrapper,
    effectiveInquirerId?: string,
    rootInquirer?: InstanceWrapper,
  ): ResolutionContext {
    return {
      contextId,
      inquirer,
      effectiveInquirerId,
      rootInquirer,
    };
  }

  private getContextInquirerId({
    inquirer,
    effectiveInquirerId,
  }: ResolutionContext): string | undefined {
    return effectiveInquirerId ?? this.getInquirerId(inquirer);
  }

  private isInContext(
    wrapper: InstanceWrapper,
    resolutionContext: ResolutionContext,
  ) {
    return (
      wrapper.isStatic(
        resolutionContext.contextId,
        resolutionContext.inquirer,
        resolutionContext.rootInquirer,
      ) ||
      wrapper.isInRequestScope(
        resolutionContext.contextId,
        resolutionContext.inquirer,
      ) ||
      wrapper.isLazyTransient(
        resolutionContext.contextId,
        resolutionContext.inquirer,
      ) ||
      wrapper.isExplicitlyRequested(
        resolutionContext.contextId,
        resolutionContext.inquirer,
      )
    );
  }

  /**
   * Request-scoped and transient providers are not created at bootstrap, so
   * their dependencies are only looked up here, without creating anything.
   * A missing dependency then fails at bootstrap rather than on first use.
   * Every lookup is awaited before the first failure is thrown.
   */
  protected async lookupSkippedProviderDependencies(
    wrapper: InstanceWrapper<Injectable>,
    moduleRef: Module,
  ) {
    const isFactoryProvider = !isNil(wrapper.inject);
    if (!isFactoryProvider && !isFunction(wrapper.metatype)) {
      return;
    }
    const [dependencies, optionalDependenciesIds] = isFactoryProvider
      ? this.getFactoryProviderDependencies(wrapper)
      : this.getClassDependencies(wrapper);
    const properties = isFactoryProvider
      ? []
      : this.reflectProperties(wrapper.metatype as Type<any>);

    const lookup = async (
      param: unknown,
      dependencyContext: InjectorDependencyContext,
      keyOrIndex: string | symbol | number,
      isOptional: boolean,
    ) => {
      try {
        await this.resolveSingleParam(
          wrapper,
          param as Type | string | symbol,
          dependencyContext,
          moduleRef,
          { contextId: STATIC_CONTEXT },
          keyOrIndex,
        );
      } catch (err) {
        if (!isOptional) {
          throw err;
        }
      }
    };
    const results = await Promise.allSettled([
      ...dependencies.map((param, index) =>
        lookup(
          param,
          { index, dependencies },
          index,
          optionalDependenciesIds.includes(index),
        ),
      ),
      ...properties.map(({ key, name, isOptional }) =>
        lookup(
          name,
          { key, name: name as Function | string | symbol },
          key,
          !!isOptional,
        ),
      ),
    ]);
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failure) {
      throw failure.reason;
    }
  }

  private shouldSkipProviderLoading(
    wrapper: InstanceWrapper<Injectable>,
    resolutionContext: ResolutionContext,
  ): boolean {
    const isStaticContext = resolutionContext.contextId === STATIC_CONTEXT;
    const hasNoInquirer = !resolutionContext.inquirer;
    const isTopLevelStaticTransientOrRequestProvider =
      hasNoInquirer && (wrapper.isTransient || wrapper.scope === Scope.REQUEST);
    const isStaticInquirerOutsideResolutionContext =
      !!resolutionContext.inquirer &&
      !this.isInContext(
        resolutionContext.inquirer,
        this.createResolutionContext(
          resolutionContext.contextId,
          resolutionContext.inquirer,
          undefined,
          resolutionContext.rootInquirer,
        ),
      );
    const shouldSkipForStaticBootstrap =
      isStaticContext &&
      (isTopLevelStaticTransientOrRequestProvider ||
        isStaticInquirerOutsideResolutionContext);

    return shouldSkipForStaticBootstrap;
  }

  /**
   * For nested TRANSIENT dependencies (TRANSIENT -> TRANSIENT) in non-static contexts,
   * returns parentInquirer to ensure each parent TRANSIENT gets its own instance.
   * This is necessary because in REQUEST/DURABLE scopes, the same TRANSIENT wrapper
   * can be used by multiple parents, causing nested TRANSIENTs to be shared incorrectly.
   * For non-TRANSIENT -> TRANSIENT, returns inquirer (current wrapper being created).
   */
  private getEffectiveInquirer(
    dependency: InstanceWrapper | undefined,
    resolutionContext: ResolutionContext,
    parentInquirer: InstanceWrapper | undefined,
  ): InstanceWrapper | undefined {
    const { inquirer, contextId, rootInquirer } = resolutionContext;
    if (dependency?.isTransient && inquirer?.isTransient && parentInquirer) {
      if (contextId === STATIC_CONTEXT) {
        return rootInquirer ?? parentInquirer;
      }
      return parentInquirer;
    }
    return inquirer;
  }

  private getEffectiveInquirerId(
    dependency: InstanceWrapper | undefined,
    resolutionContext: ResolutionContext,
    parentInquirer: InstanceWrapper | undefined,
  ): string | undefined {
    const { contextId, inquirer, effectiveInquirerId } = resolutionContext;
    if (
      contextId === STATIC_CONTEXT &&
      dependency?.isTransient &&
      inquirer?.isTransient &&
      parentInquirer
    ) {
      const baseInquirerId =
        effectiveInquirerId ?? this.getInquirerId(parentInquirer);
      return `${baseInquirerId}:${inquirer.id}`;
    }

    const effectiveInquirer = this.getEffectiveInquirer(
      dependency,
      resolutionContext,
      parentInquirer,
    );
    return this.getInquirerId(effectiveInquirer);
  }

  private getStaticTransientResolutionContext(
    resolutionContext: ResolutionContext,
    parentInquirer: InstanceWrapper | undefined,
  ): ResolutionContext {
    const { contextId, inquirer, effectiveInquirerId } = resolutionContext;
    if (
      contextId === STATIC_CONTEXT &&
      inquirer?.isTransient &&
      parentInquirer
    ) {
      const baseInquirerId =
        effectiveInquirerId ?? this.getInquirerId(parentInquirer);
      return this.createResolutionContext(
        contextId,
        inquirer,
        `${baseInquirerId}:${inquirer.id}`,
      );
    }
    return resolutionContext;
  }

  private getEffectiveResolutionContext(
    dependency: InstanceWrapper | undefined,
    resolutionContext: ResolutionContext,
    parentInquirer: InstanceWrapper | undefined,
  ): ResolutionContext {
    const effectiveInquirer = this.getEffectiveInquirer(
      dependency,
      resolutionContext,
      parentInquirer,
    );
    return this.createResolutionContext(
      resolutionContext.contextId,
      effectiveInquirer,
      this.getEffectiveInquirerId(
        dependency,
        resolutionContext,
        parentInquirer,
      ),
      // The root inquirer is the one of `inquirer`
      effectiveInquirer === resolutionContext.inquirer
        ? resolutionContext.rootInquirer
        : undefined,
    );
  }

  private hasDenseCtorMetadata<T>(
    wrapper: InstanceWrapper<T>,
    inject: InjectorDependency[] | undefined,
    metadata: InstanceWrapper[] | undefined,
  ): boolean {
    if (!metadata) {
      return false;
    }

    // The fast path requires a fully populated metadata array.
    // While another request is still registering dependency metadata,
    // sparse entries here would feed request-scoped factories `undefined`.
    const expectedDepsLength = !isNil(inject)
      ? inject.length
      : wrapper.metatype
        ? this.reflectConstructorParams(wrapper.metatype).length
        : 0;

    if (metadata.length !== expectedDepsLength) {
      return false;
    }

    for (let index = 0; index < expectedDepsLength; index++) {
      if (metadata[index] === undefined) {
        return false;
      }
    }

    return true;
  }

  private hasCompletePropertiesMetadata<T>(
    wrapper: InstanceWrapper<T>,
    metadata: PropertyMetadata[] | undefined,
  ): boolean {
    if (!metadata) {
      return false;
    }

    // The fast path requires every injected property to be registered.
    // While another request is still registering dependency metadata,
    // the missing properties would be left `undefined`.
    const properties = wrapper.metatype
      ? this.reflectProperties(wrapper.metatype as Type<any>)
      : [];

    return properties.every(({ key }) =>
      metadata.some(item => item.key === key),
    );
  }

  private resolveScopedComponentHost(
    item: InstanceWrapper,
    contextId: ContextId,
    inquirer?: InstanceWrapper,
    parentInquirer?: InstanceWrapper,
  ) {
    return this.isInquirerRequest(item, parentInquirer)
      ? parentInquirer
      : this.resolveComponentHost(
          item.host!,
          item,
          this.getEffectiveResolutionContext(
            item,
            this.createResolutionContext(contextId, inquirer),
            parentInquirer,
          ),
        );
  }

  private isInquirerRequest(
    item: InstanceWrapper,
    parentInquirer: InstanceWrapper | undefined,
  ) {
    return item.isTransient && item.name === INQUIRER && parentInquirer;
  }

  private isInquirer(
    param: unknown,
    parentInquirer: InstanceWrapper | undefined,
  ) {
    return param === INQUIRER && parentInquirer;
  }

  protected addDependencyMetadata(
    keyOrIndex: symbol | string | number,
    hostWrapper: InstanceWrapper,
    instanceWrapper: InstanceWrapper,
  ) {
    if (isSymbol(keyOrIndex) || isString(keyOrIndex)) {
      hostWrapper.addPropertiesMetadata(keyOrIndex, instanceWrapper);
    } else {
      hostWrapper.addCtorMetadata(keyOrIndex, instanceWrapper);
    }
  }

  private getTokenName(token: InjectionToken): string {
    return isFunction(token) ? (token as Function).name : token.toString();
  }

  private printResolvingDependenciesLog(
    token: InjectionToken,
    inquirer?: InstanceWrapper,
  ): void {
    if (!isDebugMode()) {
      return;
    }
    const tokenName = this.getTokenName(token);
    const dependentName =
      (inquirer?.name && inquirer.name.toString?.()) ?? 'unknown';
    const isAlias = dependentName === tokenName;

    const messageToPrint = `Resolving dependency ${clc.cyanBright(
      tokenName,
    )}${clc.green(' in the ')}${clc.yellow(dependentName)}${clc.green(
      ` provider ${isAlias ? '(alias)' : ''}`,
    )}`;

    this.logger.log(messageToPrint);
  }

  private printLookingForProviderLog(
    token: InjectionToken,
    moduleRef: Module,
  ): void {
    if (!isDebugMode()) {
      return;
    }
    const tokenName = this.getTokenName(token);
    const moduleRefName = moduleRef?.metatype?.name ?? 'unknown';
    this.logger.log(
      `Looking for ${clc.cyanBright(tokenName)}${clc.green(
        ' in ',
      )}${clc.magentaBright(moduleRefName)}`,
    );
  }

  private printFoundInModuleLog(
    token: InjectionToken,
    moduleRef: Module,
  ): void {
    if (!isDebugMode()) {
      return;
    }
    const tokenName = this.getTokenName(token);
    const moduleRefName = moduleRef?.metatype?.name ?? 'unknown';
    this.logger.log(
      `Found ${clc.cyanBright(tokenName)}${clc.green(
        ' in ',
      )}${clc.magentaBright(moduleRefName)}`,
    );
  }

  private getContextId(
    contextId: ContextId,
    instanceWrapper: InstanceWrapper,
  ): ContextId {
    return contextId.getParent
      ? contextId.getParent({
          token: instanceWrapper.token,
          isTreeDurable: instanceWrapper.isDependencyTreeDurable(),
        })
      : contextId;
  }

  private getNowTimestamp() {
    return performance.now();
  }
}
