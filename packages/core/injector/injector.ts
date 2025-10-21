import {
  InjectionToken,
  Logger,
  LoggerService,
  OptionalFactoryDependency,
} from '@nestjs/common';
import {
  OPTIONAL_DEPS_METADATA,
  OPTIONAL_PROPERTY_DEPS_METADATA,
  PARAMTYPES_METADATA,
  PROPERTY_DEPS_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from '@nestjs/common/constants';
import {
  Controller,
  ForwardReference,
  Injectable,
  Type,
} from '@nestjs/common/interfaces';
import { clc } from '@nestjs/common/utils/cli-colors.util';
import {
  isFunction,
  isNil,
  isObject,
  isString,
  isSymbol,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import { performance } from 'perf_hooks';
import { CircularDependencyException } from '../errors/exceptions';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { UndefinedDependencyException } from '../errors/exceptions/undefined-dependency.exception';
import { UnknownDependenciesException } from '../errors/exceptions/unknown-dependencies.exception';
import { Barrier } from '../helpers/barrier';
import { STATIC_CONTEXT } from './constants';
import { INQUIRER } from './inquirer';
import {
  ContextId,
  InstancePerContext,
  InstanceWrapper,
  PropertyMetadata,
} from './instance-wrapper';
import { Module } from './module';
import { SettlementSignal } from './settlement-signal';

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

export class Injector {
  private logger: LoggerService = new Logger('InjectorLogger');
  private readonly instanceDecorator: (target: unknown) => unknown = (
    target: unknown,
  ) => target;

  constructor(
    private readonly options?: {
      /**
       * Whether to enable preview mode.
       */
      preview: boolean;
      /**
       * Function to decorate a freshly created instance.
       */
      instanceDecorator?: (target: unknown) => unknown;
    },
  ) {
    if (options?.instanceDecorator) {
      this.instanceDecorator = options.instanceDecorator;
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
      const wrapper = new InstanceWrapper({
        ...target,
        instance,
      });
      collection.set(token, wrapper);
    }
  }

  public async loadInstance<T>(
    wrapper: InstanceWrapper<T>,
    collection: Map<InjectionToken, InstanceWrapper>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ) {
    const inquirerId = this.getInquirerId(inquirer);
    const instanceHost = wrapper.getInstanceByContextId(
      this.getContextId(contextId, wrapper),
      inquirerId,
    );

    if (instanceHost.isPending) {
      const settlementSignal = wrapper.settlementSignal;
      if (inquirer && settlementSignal?.isCycle(inquirer.id)) {
        throw new CircularDependencyException(`"${wrapper.name}"`);
      }

      return instanceHost.donePromise!.then((err?: unknown) => {
        if (err) {
          throw err;
        }
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
      const callback = async (instances: unknown[]) => {
        const properties = await this.resolveProperties(
          wrapper,
          moduleRef,
          inject as InjectionToken[],
          contextId,
          wrapper,
          inquirer,
        );
        const instance = await this.instantiateClass(
          instances,
          wrapper,
          targetWrapper,
          contextId,
          inquirer,
        );
        this.applyProperties(instance, properties);
        wrapper.initTime = this.getNowTimestamp() - t0;
        settlementSignal.complete();
      };
      await this.resolveConstructorParams<T>(
        wrapper,
        moduleRef,
        inject as InjectionToken[],
        callback,
        contextId,
        wrapper,
        inquirer,
      );
    } catch (err) {
      wrapper.removeInstanceByContextId(
        this.getContextId(contextId, wrapper),
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
      contextId,
      inquirer || wrapper,
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
      contextId,
      wrapper,
    );
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
      contextId,
      inquirer,
    );
  }

  public async loadProvider(
    wrapper: InstanceWrapper<Injectable>,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ) {
    const providers = moduleRef.providers;
    await this.loadInstance<Injectable>(
      wrapper,
      providers,
      moduleRef,
      contextId,
      inquirer,
    );
    await this.loadEnhancersPerContext(wrapper, contextId, wrapper);
  }

  public applySettlementSignal<T>(
    instancePerContext: InstancePerContext<T>,
    host: InstanceWrapper<T>,
  ) {
    const settlementSignal = new SettlementSignal();
    instancePerContext.donePromise = settlementSignal.asPromise();
    instancePerContext.isPending = true;
    host.settlementSignal = settlementSignal;

    return settlementSignal;
  }

  public async resolveConstructorParams<T>(
    wrapper: InstanceWrapper<T>,
    moduleRef: Module,
    inject: InjectorDependency[] | undefined,
    callback: (args: unknown[]) => void | Promise<void>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    parentInquirer?: InstanceWrapper,
  ) {
    const metadata = wrapper.getCtorMetadata();

    if (metadata && contextId !== STATIC_CONTEXT) {
      const deps = await this.loadCtorMetadata(
        metadata,
        contextId,
        inquirer,
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
    const resolveParam = async (param: unknown, index: number) => {
      try {
        if (this.isInquirer(param, parentInquirer)) {
          /*
           * Signal the barrier to make sure other dependencies do not get stuck waiting forever.
           */
          paramBarrier.signal();

          return parentInquirer && parentInquirer.instance;
        }
        if (inquirer?.isTransient && parentInquirer) {
          // When `inquirer` is transient too, inherit the parent inquirer
          // This is required to ensure that transient providers are only resolved
          // when requested
          inquirer.attachRootInquirer(parentInquirer);
        }
        const paramWrapper = await this.resolveSingleParam<T>(
          wrapper,
          param as Type | string | symbol,
          { index, dependencies },
          moduleRef,
          contextId,
          inquirer,
          index,
        );

        /*
         * Ensure that all instance wrappers are resolved at this point before we continue.
         * Otherwise the staticity of `wrapper`'s dependency tree may be evaluated incorrectly
         * and result in undefined / null injection.
         */
        await paramBarrier.signalAndWait();

        const effectiveInquirer = this.getEffectiveInquirer(
          paramWrapper,
          inquirer,
          parentInquirer,
          contextId,
        );
        const paramWrapperWithInstance = await this.resolveComponentHost(
          moduleRef,
          paramWrapper,
          contextId,
          effectiveInquirer,
        );
        const instanceHost = paramWrapperWithInstance.getInstanceByContextId(
          this.getContextId(contextId, paramWrapperWithInstance),
          this.getInquirerId(effectiveInquirer),
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
    isResolved && (await callback(instances));
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
      return (
        !isUndefined((value as OptionalFactoryDependency).token) &&
        !isUndefined((value as OptionalFactoryDependency).optional) &&
        !(value as any).prototype
      );
    }

    const mapFactoryProviderInjectArray = (
      item: InjectionToken | OptionalFactoryDependency,
      index: number,
    ): InjectionToken => {
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
    return [
      wrapper.inject?.map?.(mapFactoryProviderInjectArray) as any[],
      optionalDependenciesIds,
    ];
  }

  public reflectConstructorParams<T>(type: Type<T>): any[] {
    const paramtypes = [
      ...(Reflect.getMetadata(PARAMTYPES_METADATA, type) || []),
    ];
    const selfParams = this.reflectSelfParams<T>(type);

    selfParams.forEach(({ index, param }) => (paramtypes[index] = param));
    return paramtypes;
  }

  public reflectOptionalParams<T>(type: Type<T>): any[] {
    return Reflect.getMetadata(OPTIONAL_DEPS_METADATA, type) || [];
  }

  public reflectSelfParams<T>(type: Type<T>): any[] {
    return Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, type) || [];
  }

  public async resolveSingleParam<T>(
    wrapper: InstanceWrapper<T>,
    param: Type<any> | string | symbol,
    dependencyContext: InjectorDependencyContext,
    moduleRef: Module,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
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
      contextId,
      inquirer,
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
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: symbol | string | number,
  ): Promise<InstanceWrapper> {
    this.printResolvingDependenciesLog(token, inquirer);
    this.printLookingForProviderLog(token, moduleRef);
    const providers = moduleRef.providers;
    return this.lookupComponent(
      providers,
      moduleRef,
      { ...dependencyContext, name: token },
      wrapper,
      contextId,
      inquirer,
      keyOrIndex,
    );
  }

  public async resolveComponentHost<T>(
    moduleRef: Module,
    instanceWrapper: InstanceWrapper<T | Promise<T>>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ): Promise<InstanceWrapper> {
    const inquirerId = this.getInquirerId(inquirer);
    const instanceHost = instanceWrapper.getInstanceByContextId(
      this.getContextId(contextId, instanceWrapper),
      inquirerId,
    );
    if (!instanceHost.isResolved && !instanceWrapper.forwardRef) {
      inquirer?.settlementSignal?.insertRef(instanceWrapper.id);

      await this.loadProvider(
        instanceWrapper,
        instanceWrapper.host ?? moduleRef,
        contextId,
        inquirer,
      );
    } else if (
      !instanceHost.isResolved &&
      instanceWrapper.forwardRef &&
      (contextId !== STATIC_CONTEXT || !!inquirerId)
    ) {
      /**
       * When circular dependency has been detected between
       * either request/transient providers, we have to asynchronously
       * resolve instance host for a specific contextId or inquirer, to ensure
       * that eventual lazily created instance will be merged with the prototype
       * instantiated beforehand.
       */
      instanceHost.donePromise &&
        void instanceHost.donePromise.then(() =>
          this.loadProvider(instanceWrapper, moduleRef, contextId, inquirer),
        );
    }
    if (instanceWrapper.async) {
      const host = instanceWrapper.getInstanceByContextId(
        this.getContextId(contextId, instanceWrapper),
        inquirerId,
      );
      host.instance = await host.instance;
      instanceWrapper.setInstanceByContextId(contextId, host, inquirerId);
    }
    return instanceWrapper;
  }

  public async lookupComponent<T = any>(
    providers: Map<Function | string | symbol, InstanceWrapper>,
    moduleRef: Module,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
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
      contextId,
      inquirer,
      keyOrIndex,
    );
  }

  public async lookupComponentInParentModules<T = any>(
    dependencyContext: InjectorDependencyContext,
    moduleRef: Module,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: symbol | string | number,
  ) {
    const instanceWrapper = await this.lookupComponentInImports(
      moduleRef,
      dependencyContext.name!,
      wrapper,
      [],
      contextId,
      inquirer,
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
    moduleRegistry: any[] = [],
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
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
      if (moduleRegistry.includes(relatedModule.id)) {
        continue;
      }
      this.printLookingForProviderLog(name, relatedModule);
      moduleRegistry.push(relatedModule.id);

      const { providers, exports } = relatedModule;
      if (!exports.has(name) || !providers.has(name)) {
        const instanceRef = await this.lookupComponentInImports(
          relatedModule,
          name,
          wrapper,
          moduleRegistry,
          contextId,
          inquirer,
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

      const inquirerId = this.getInquirerId(inquirer);
      const instanceHost = instanceWrapperRef.getInstanceByContextId(
        this.getContextId(contextId, instanceWrapperRef),
        inquirerId,
      );
      if (!instanceHost.isResolved && !instanceWrapperRef.forwardRef) {
        /*
         * Provider will be loaded shortly in resolveComponentHost() once we pass the current
         * Barrier. We cannot load it here because doing so could incorrectly evaluate the
         * staticity of the dependency tree and lead to undefined / null injection.
         */
        break;
      }
    }
    return instanceWrapperRef;
  }

  public async resolveProperties<T>(
    wrapper: InstanceWrapper<T>,
    moduleRef: Module,
    inject?: InjectorDependency[],
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    parentInquirer?: InstanceWrapper,
  ): Promise<PropertyDependency[]> {
    if (!isNil(inject)) {
      return [];
    }
    const metadata = wrapper.getPropertiesMetadata();
    if (metadata && contextId !== STATIC_CONTEXT) {
      return this.loadPropertiesMetadata(metadata, contextId, inquirer);
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
          const paramWrapper = await this.resolveSingleParam<T>(
            wrapper,
            item.name as string,
            dependencyContext,
            moduleRef,
            contextId,
            inquirer,
            item.key,
          );

          /*
           * Ensure that all instance wrappers are resolved at this point before we continue.
           * Otherwise the staticity of `wrapper`'s dependency tree may be evaluated incorrectly
           * and result in undefined / null injection.
           */
          await propertyBarrier.signalAndWait();

          const effectivePropertyInquirer = this.getEffectiveInquirer(
            paramWrapper,
            inquirer,
            parentInquirer,
            contextId,
          );
          const paramWrapperWithInstance = await this.resolveComponentHost(
            moduleRef,
            paramWrapper,
            contextId,
            effectivePropertyInquirer,
          );
          if (!paramWrapperWithInstance) {
            return undefined;
          }
          const instanceHost = paramWrapperWithInstance.getInstanceByContextId(
            this.getContextId(contextId, paramWrapperWithInstance),
            this.getInquirerId(effectivePropertyInquirer),
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
      return undefined;
    }
    iterate(properties)
      .filter(item => !isNil(item.instance))
      .forEach(item => (instance[item.key] = item.instance));
  }

  public async instantiateClass<T = any>(
    instances: any[],
    wrapper: InstanceWrapper,
    targetMetatype: InstanceWrapper,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
  ): Promise<T> {
    const { metatype, inject } = wrapper;
    const inquirerId = this.getInquirerId(inquirer);
    const instanceHost = targetMetatype.getInstanceByContextId(
      this.getContextId(contextId, targetMetatype),
      inquirerId,
    );
    const isInContext =
      wrapper.isStatic(contextId, inquirer) ||
      wrapper.isInRequestScope(contextId, inquirer) ||
      wrapper.isLazyTransient(contextId, inquirer) ||
      wrapper.isExplicitlyRequested(contextId, inquirer);

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
      wrapper = collection.get(injectionToken);
    }
    await this.loadInstance(wrapper!, collection, moduleRef, ctx, wrapper);
    await this.loadEnhancersPerContext(wrapper!, ctx, wrapper);

    const host = wrapper!.getInstanceByContextId(
      this.getContextId(ctx, wrapper!),
      wrapper!.id,
    );
    return host && (host.instance as T);
  }

  public async loadEnhancersPerContext(
    wrapper: InstanceWrapper,
    ctx: ContextId,
    inquirer?: InstanceWrapper,
  ) {
    const enhancers = wrapper.getEnhancersMetadata() || [];
    const loadEnhancer = (item: InstanceWrapper) => {
      const hostModule = item.host!;
      return this.loadInstance(
        item,
        hostModule.injectables,
        hostModule,
        ctx,
        inquirer,
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
      const effectiveInquirer = this.getEffectiveInquirer(
        dependency,
        inquirer,
        parentInquirer,
        contextId,
      );

      return item?.getInstanceByContextId(
        this.getContextId(contextId, item),
        this.getInquirerId(effectiveInquirer),
      ).instance;
    });
  }

  public async loadPropertiesMetadata(
    metadata: PropertyMetadata[],
    contextId: ContextId,
    inquirer?: InstanceWrapper,
  ): Promise<PropertyDependency[]> {
    const dependenciesHosts = await Promise.all(
      metadata.map(async ({ wrapper: item, key }) => ({
        key,
        host: await this.resolveComponentHost(
          item.host!,
          item,
          contextId,
          inquirer,
        ),
      })),
    );
    const inquirerId = this.getInquirerId(inquirer);
    return dependenciesHosts.map(({ key, host }) => ({
      key,
      name: key,
      instance: host.getInstanceByContextId(
        this.getContextId(contextId, host),
        inquirerId,
      ).instance,
    }));
  }

  private getInquirerId(
    inquirer: InstanceWrapper | undefined,
  ): string | undefined {
    return inquirer ? inquirer.id : undefined;
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
    inquirer: InstanceWrapper | undefined,
    parentInquirer: InstanceWrapper | undefined,
    contextId: ContextId,
  ): InstanceWrapper | undefined {
    return dependency?.isTransient &&
      inquirer?.isTransient &&
      parentInquirer &&
      contextId !== STATIC_CONTEXT
      ? parentInquirer
      : inquirer;
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
          contextId,
          this.getEffectiveInquirer(item, inquirer, parentInquirer, contextId),
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
    if (!this.isDebugMode()) {
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
    if (!this.isDebugMode()) {
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
    if (!this.isDebugMode()) {
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

  private isDebugMode(): boolean {
    return !!process.env.NEST_DEBUG;
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
