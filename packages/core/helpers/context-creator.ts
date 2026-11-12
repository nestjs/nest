import { STATIC_CONTEXT } from '../injector/constants.js';
import { ContextId, InstanceWrapper } from '../injector/instance-wrapper.js';
import { getClassRef } from './class-ref-registry.js';
import { type Controller, isFunction } from '@nestjs/common/internal';

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
   * Returns the enhancer to run for one bound as a class: the instance that
   * the container holds for it. The class itself is used only when that
   * instance doesn't implement the method and the class has a static one of
   * that name, so a static method no longer takes the place of the instance.
   */
  protected pickEnhancer<T extends object>(
    metatype: Function,
    instance: T | null | undefined,
    methodKey: keyof T,
  ): T | null {
    if (instance && isFunction(instance[methodKey])) {
      return instance;
    }
    if (isFunction((metatype as unknown as T)[methodKey])) {
      return metatype as unknown as T;
    }
    return instance ?? null;
  }

  protected getContextId(
    contextId: ContextId,
    instanceWrapper: InstanceWrapper,
  ): ContextId {
    return contextId.getParent
      ? contextId.getParent({
          token: instanceWrapper.token,
          // A transient instance belongs to the consumer it was created for,
          // which is not necessarily durable, so it is never shared through
          // a durable sub-tree
          isTreeDurable:
            !instanceWrapper.isTransient &&
            instanceWrapper.isDependencyTreeDurable(),
        })
      : contextId;
  }
}
