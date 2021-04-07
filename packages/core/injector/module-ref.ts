import { IntrospectionResult, Scope, Type } from '@nestjs/common';

import { InvalidClassScopeException } from '../errors/exceptions/invalid-class-scope.exception';
import { UnknownElementException } from '../errors/exceptions/unknown-element.exception';
import { getClassScope } from '../helpers/get-class-scope';

import { NestContainer } from './container';
import { Injector } from './injector';
import { InstanceLinksHost } from './instance-links-host';
import { ContextId, InstanceWrapper } from './instance-wrapper';
import { Module } from './module';

export abstract class ModuleRef {
  private readonly injector = new Injector();
  private _instanceLinksHost: InstanceLinksHost;

  private get instanceLinksHost() {
    if (!this._instanceLinksHost) {
      this._instanceLinksHost = new InstanceLinksHost(this.container);
    }
    return this._instanceLinksHost;
  }

  constructor(protected readonly container: NestContainer) {}

  public abstract get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    options?: { strict: boolean },
  ): TResult;
  public abstract resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    contextId?: ContextId,
    options?: { strict: boolean },
  ): Promise<TResult>;
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

  protected find<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    contextModule?: Module,
  ): TResult {
    const moduleId = contextModule && contextModule.id;
    const { wrapperRef } = this.instanceLinksHost.get<TResult>(
      typeOrToken,
      moduleId,
    );
    if (
      wrapperRef.scope === Scope.REQUEST ||
      wrapperRef.scope === Scope.TRANSIENT
    ) {
      throw new InvalidClassScopeException(typeOrToken);
    }
    return wrapperRef.instance;
  }

  protected async resolvePerContext<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    contextModule: Module,
    contextId: ContextId,
    options?: { strict: boolean },
  ): Promise<TResult> {
    const isStrictModeEnabled = options && options.strict;
    const instanceLink = isStrictModeEnabled
      ? this.instanceLinksHost.get(typeOrToken, contextModule.id)
      : this.instanceLinksHost.get(typeOrToken);

    const { wrapperRef, collection } = instanceLink;
    if (wrapperRef.isDependencyTreeStatic() && !wrapperRef.isTransient) {
      return this.get(typeOrToken);
    }

    const ctorHost = wrapperRef.instance || { constructor: typeOrToken };
    const instance = await this.injector.loadPerContext(
      ctorHost,
      wrapperRef.host,
      collection,
      contextId,
      wrapperRef,
    );
    if (!instance) {
      throw new UnknownElementException();
    }
    return instance;
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
