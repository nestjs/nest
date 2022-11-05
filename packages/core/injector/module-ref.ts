import { IntrospectionResult, Scope, Type } from '@nestjs/common';
import { GetOrResolveOptions } from '@nestjs/common/interfaces';
import { getClassScope } from '../helpers/get-class-scope';
import { isDurable } from '../helpers/is-durable';
import { AbstractInstanceResolver } from './abstract-instance-resolver';
import { NestContainer } from './container';
import { Injector } from './injector';
import { InstanceLinksHost } from './instance-links-host';
import { ContextId, InstanceWrapper } from './instance-wrapper';
import { Module } from './module';

export abstract class ModuleRef extends AbstractInstanceResolver {
  protected readonly injector = new Injector();
  private _instanceLinksHost: InstanceLinksHost;

  protected get instanceLinksHost() {
    if (!this._instanceLinksHost) {
      this._instanceLinksHost = new InstanceLinksHost(this.container);
    }
    return this._instanceLinksHost;
  }

  constructor(protected readonly container: NestContainer) {
    super();
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
    options: { strict?: boolean; each?: undefined | false },
  ): TResult;
  /**
   * Retrieves a list of instances of either injectables or controllers, otherwise, throws exception.
   * @returns {Array<TResult>}
   */
  abstract get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options: { strict?: boolean; each: true },
  ): Array<TResult>;
  /**
   * Retrieves an instance (or a list of instances) of either injectable or controller, otherwise, throws exception.
   * @returns {TResult | Array<TResult>}
   */
  abstract get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options?: GetOrResolveOptions,
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
    options?: GetOrResolveOptions,
  ): Promise<TResult | Array<TResult>>;

  public abstract create<T = any>(type: Type<T>): Promise<T>;

  public introspect<T = any>(
    token: Type<T> | string | symbol,
  ): IntrospectionResult {
    const { wrapperRef } = this.instanceLinksHost.get(token);

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
  ): Promise<T> {
    const wrapper = new InstanceWrapper({
      name: type && type.name,
      metatype: type,
      isResolved: false,
      scope: getClassScope(type),
      durable: isDurable(type),
      host: moduleRef,
    });
    return new Promise<T>(async (resolve, reject) => {
      try {
        const callback = async (instances: any[]) => {
          const properties = await this.injector.resolveProperties(
            wrapper,
            moduleRef,
          );
          const instance = new type(...instances);
          this.injector.applyProperties(instance, properties);
          resolve(instance);
        };
        await this.injector.resolveConstructorParams<T>(
          wrapper,
          moduleRef,
          undefined,
          callback,
        );
      } catch (err) {
        reject(err);
      }
    });
  }
}
