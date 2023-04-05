import { Abstract, Scope, Type } from '@nestjs/common';
import { GetOrResolveOptions } from '@nestjs/common/interfaces';
import {
  InvalidClassScopeException,
  UnknownElementException,
} from '../errors/exceptions';
import { Injector } from './injector';
import { InstanceLink, InstanceLinksHost } from './instance-links-host';
import { ContextId } from './instance-wrapper';
import { Module } from './module';

export abstract class AbstractInstanceResolver {
  protected abstract instanceLinksHost: InstanceLinksHost;
  protected abstract injector: Injector;

  protected abstract get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Function | string | symbol,
    options?: GetOrResolveOptions,
  ): TResult | Array<TResult>;

  protected find<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    options: { moduleId?: string; each?: boolean },
  ): TResult | Array<TResult> {
    const instanceLinkOrArray = this.instanceLinksHost.get<TResult>(
      typeOrToken,
      options,
    );
    const pluckInstance = ({ wrapperRef }: InstanceLink) => {
      if (
        wrapperRef.scope === Scope.REQUEST ||
        wrapperRef.scope === Scope.TRANSIENT
      ) {
        throw new InvalidClassScopeException(typeOrToken);
      }
      return wrapperRef.instance;
    };
    if (Array.isArray(instanceLinkOrArray)) {
      return instanceLinkOrArray.map(pluckInstance);
    }
    return pluckInstance(instanceLinkOrArray);
  }

  protected async resolvePerContext<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    contextModule: Module,
    contextId: ContextId,
    options?: GetOrResolveOptions,
  ): Promise<TResult | Array<TResult>> {
    const instanceLinkOrArray = options?.strict
      ? this.instanceLinksHost.get(typeOrToken, {
          moduleId: contextModule.id,
          each: options.each,
        })
      : this.instanceLinksHost.get(typeOrToken, {
          each: options.each,
        });

    const pluckInstance = async (instanceLink: InstanceLink) => {
      const { wrapperRef, collection } = instanceLink;
      if (wrapperRef.isDependencyTreeStatic() && !wrapperRef.isTransient) {
        return this.get(typeOrToken, { strict: options.strict });
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
    };

    if (Array.isArray(instanceLinkOrArray)) {
      return Promise.all(
        instanceLinkOrArray.map(instanceLink => pluckInstance(instanceLink)),
      );
    }
    return pluckInstance(instanceLinkOrArray);
  }
}
