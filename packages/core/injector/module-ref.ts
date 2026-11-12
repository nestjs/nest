import { IntrospectionResult, Scope, Type } from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { RequestScopedCreateException } from '../errors/exceptions/request-scoped-create.exception';
import { getClassScope } from '../helpers/get-class-scope';
import { isDurable } from '../helpers/is-durable';
import { AbstractInstanceResolver } from './abstract-instance-resolver';
import { STATIC_CONTEXT } from './constants';
import { NestContainer } from './container';
import { Injector } from './injector';
import { InstanceLinksHost } from './instance-links-host';
import {
  ContextId,
  INSTANCE_ID_SYMBOL,
  InstanceWrapper,
} from './instance-wrapper';
import { Module } from './module';

export interface ModuleRefGetOrResolveOpts {
  /**
   * If enabled, lookup will only be performed in the host module.
   * @default true
   */
  strict?: boolean;
  /**
   * If enabled, instead of returning a first instance registered under a given token,
   * a list of instances will be returned.
   * @default false
   */
  each?: boolean;
}

export abstract class ModuleRef extends AbstractInstanceResolver {
  protected readonly injector: Injector;
  private _instanceLinksHost: InstanceLinksHost;

  protected get instanceLinksHost() {
    if (!this._instanceLinksHost) {
      this._instanceLinksHost = new InstanceLinksHost(this.container);
    }
    return this._instanceLinksHost;
  }

  constructor(protected readonly container: NestContainer) {
    super();

    const contextOptions = container.contextOptions;

    this.injector = new Injector({
      preview: contextOptions?.preview ?? false,
      snapshot: contextOptions?.snapshot,
      instanceDecorator: contextOptions?.instrument?.instanceDecorator,
    });
  }

  /**
   * Retrieves an instance of either injectable or controller, otherwise, throws exception.
   * @returns {TResult}
   */
  abstract get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
  ): TResult;
  /**
   * Retrieves an instance of either injectable or controller, otherwise, throws exception.
   * @returns {TResult}
   */
  abstract get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options: {
      /**
       * If enabled, lookup will only be performed in the host module.
       * @default true
       */
      strict?: boolean;
      /** This indicates that only the first instance registered will be returned. */
      each?: undefined | false;
    },
  ): TResult;
  /**
   * Retrieves a list of instances of either injectables or controllers, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  abstract get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options: {
      /**
       * If enabled, lookup will only be performed in the host module.
       * @default true
       */
      strict?: boolean;
      /** This indicates that a list of instances will be returned. */
      each: true;
    },
  ): Array<TResult>;
  /**
   * Retrieves an instance (or a list of instances) of either injectable or controller, otherwise, throws exception.
   * @returns {TResult | Array<TResult>}
   */
  abstract get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options?: ModuleRefGetOrResolveOpts,
  ): TResult | Array<TResult>;

  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  abstract resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  abstract resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: { id: number },
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  abstract resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: { id: number },
    options?: { strict?: boolean; each?: undefined | false },
  ): Promise<TResult>;
  /**
   * Resolves transient or request-scoped instances of either injectables or controllers, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  abstract resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: { id: number },
    options?: { strict?: boolean; each: true },
  ): Promise<Array<TResult>>;
  /**
   * Resolves transient or request-scoped instance (or a list of instances) of either injectable or controller, otherwise, throws exception.
   * @returns {Promise<TResult | Array<TResult>>}
   */
  abstract resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    contextId?: { id: number },
    options?: ModuleRefGetOrResolveOpts,
  ): Promise<TResult | Array<TResult>>;

  public abstract create<T = any>(
    type: Type<T>,
    contextId?: ContextId,
  ): Promise<T>;

  public introspect<T = any>(
    token: Type<T> | string | symbol,
  ): IntrospectionResult {
    const { wrapperRef: wrapper } = this.instanceLinksHost.get(token);
    // An alias (`useExisting`) has the scope of the provider it stands for
    const wrapperRef = wrapper.isAlias
      ? this.injector.getAliasedWrapper(wrapper)
      : wrapper;

    let scope = Scope.DEFAULT;
    if (!wrapperRef.isDependencyTreeStatic()) {
      scope = Scope.REQUEST;
    } else if (wrapperRef.isTransient) {
      scope = Scope.TRANSIENT;
    }
    return { scope };
  }

  public registerRequestByContextId<T = any>(request: T, contextId: ContextId) {
    this.container.registerRequestProvider(request, contextId);
  }

  protected async instantiateClass<T = any>(
    type: Type<T>,
    moduleRef: Module,
    contextId?: ContextId,
  ): Promise<T> {
    const wrapper = new InstanceWrapper({
      name: type && type.name,
      metatype: type,
      isResolved: false,
      scope: getClassScope(type),
      durable: isDurable(type),
      host: moduleRef,
      // Thrown away once the instance is created, and never a node of the
      // serialized graph, so it takes no deterministic id (snapshot mode)
      // from a registry that would grow with every call
      [INSTANCE_ID_SYMBOL]: randomStringGenerator(),
    });

    if (type?.prototype) {
      wrapper.setInstanceByContextId(contextId ?? STATIC_CONTEXT, {
        instance: Object.create(type.prototype),
        isResolved: false,
        isPending: false,
      });
    }

    return new Promise<T>((resolve, reject) => {
      let isCreated = false;
      const callback = async (instances: any[]) => {
        try {
          const properties = await this.injector.resolveProperties(
            wrapper,
            moduleRef,
            undefined,
            {
              contextId: contextId ?? STATIC_CONTEXT,
              inquirer: wrapper,
            },
          );
          // In the static context, a request-scoped provider is a placeholder
          // that is never constructed and is shared by every caller. Unlike a
          // constructor parameter, one injected into a property (of the class
          // or of one of its dependencies) does not skip this callback, so
          // return without creating the instance, and create() rejects below
          if (
            (contextId ?? STATIC_CONTEXT) === STATIC_CONTEXT &&
            wrapper.introspectDepsAttribute(dependencies =>
              dependencies.some(item => !item.isDependencyTreeStatic()),
            )
          ) {
            return;
          }
          const instance = new type(...instances);
          this.injector.applyProperties(instance, properties);
          isCreated = true;
          resolve(instance);
        } catch (err) {
          reject(err);
        }
      };
      this.injector
        .resolveConstructorParams<T>(wrapper, moduleRef, undefined, callback, {
          contextId: contextId ?? STATIC_CONTEXT,
          inquirer: wrapper,
        })
        .then(() => {
          // The callback is skipped when a dependency is request-scoped
          if (!isCreated) {
            reject(new RequestScopedCreateException(type.name));
          }
        })
        .catch(reject);
    }).finally(() => wrapper.detachFromDependencies());
  }
}
