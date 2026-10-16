import { iterate } from 'iterare';
import { STATIC_CONTEXT } from '../injector/constants.js';
import { ContextId, InstanceWrapper } from '../injector/instance-wrapper.js';
import { getClassRef } from './class-ref-registry.js';
import type { Controller } from '@nestjs/common/internal';

export abstract class ContextCreator {
  public abstract createConcreteContext<T extends any[], R extends any[]>(
    metadata: T,
    contextId?: ContextId,
    inquirerId?: string,
  ): R;
  public getGlobalMetadata?<T extends any[]>(
    contextId?: ContextId,
    inquirerId?: string,
  ): T;

  public createContext<T extends unknown[] = any, R extends unknown[] = any>(
    instance: Controller,
    callback: (...args: any[]) => void,
    metadataKey: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): R {
    const globalMetadata =
      this.getGlobalMetadata &&
      this.getGlobalMetadata<T>(contextId, inquirerId);
    const classMetadata = this.reflectClassMetadata<T>(instance, metadataKey);
    const methodMetadata = this.reflectMethodMetadata<T>(callback, metadataKey);
    return [
      ...this.createConcreteContext<T, R>(
        globalMetadata || ([] as unknown[] as T),
        contextId,
        inquirerId,
      ),
      ...this.createConcreteContext<T, R>(classMetadata, contextId, inquirerId),
      ...this.createConcreteContext<T, R>(
        methodMetadata,
        contextId,
        inquirerId,
      ),
    ] as R;
  }

  public reflectClassMetadata<T>(instance: Controller, metadataKey: string): T {
    return Reflect.getMetadata(metadataKey, getClassRef(instance));
  }

  public reflectMethodMetadata<T>(
    callback: (...args: unknown[]) => unknown,
    metadataKey: string,
  ): T {
    return Reflect.getMetadata(metadataKey, callback);
  }

  /**
   * Resolves the request/transient scoped entries of a list of global
   * enhancers where they were bound, so that the order they were bound in,
   * whatever their scope, is the order they apply in.
   */
  protected resolveGlobalEnhancers<T>(
    enhancers: Array<T | InstanceWrapper<T>>,
    contextId: ContextId,
    inquirerId?: string,
  ): T[] {
    return iterate(enhancers)
      .map(enhancer =>
        enhancer instanceof InstanceWrapper
          ? enhancer.getInstanceByContextId(
              this.getContextId(contextId, enhancer),
              inquirerId,
            )?.instance
          : enhancer,
      )
      .filter(enhancer => !!enhancer)
      .toArray() as T[];
  }

  protected getContextId(
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
}
