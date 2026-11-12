import type { CanActivate } from '@nestjs/common';
import { iterate } from 'iterare';
import { ApplicationConfig } from '../application-config.js';
import {
  assertEnhancer,
  describeEnhancer,
} from '../helpers/assert-enhancer.js';
import { ContextCreator } from '../helpers/context-creator.js';
import { STATIC_CONTEXT } from '../injector/constants.js';
import { NestContainer } from '../injector/container.js';
import { InstanceWrapper } from '../injector/instance-wrapper.js';
import {
  GUARDS_METADATA,
  type Controller,
  isEmpty,
  isFunction,
} from '@nestjs/common/internal';
import type { Type } from '@nestjs/common';

export class GuardsContextCreator extends ContextCreator {
  private moduleContext: string;

  constructor(
    private readonly container: NestContainer,
    private readonly config?: ApplicationConfig,
  ) {
    super();
  }

  public create(
    instance: Controller,
    callback: (...args: unknown[]) => unknown,
    module: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): CanActivate[] {
    this.moduleContext = module;
    return this.createContext(
      instance,
      callback,
      GUARDS_METADATA,
      contextId,
      inquirerId,
    );
  }

  public createConcreteContext<T extends unknown[], R extends unknown[]>(
    metadata: T,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): R {
    if (isEmpty(metadata)) {
      return [] as unknown[] as R;
    }
    return iterate(metadata)
      .filter(
        (guard: any) =>
          guard && (isFunction(guard) || isFunction(guard.canActivate)),
      )
      .map(guard =>
        this.getGuardInstance(guard as Function, contextId, inquirerId),
      )
      .filter(
        (guard: CanActivate | null) => !!guard && isFunction(guard.canActivate),
      )
      .toArray() as R;
  }

  public getGuardInstance(
    metatype: Function | CanActivate,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): CanActivate | null {
    if (!isFunction(metatype)) {
      return metatype;
    }
    const instanceWrapper = this.getInstanceByMetatype(
      metatype as Type<unknown>,
    );
    if (!instanceWrapper) {
      return this.pickEnhancer<CanActivate>(metatype, null, 'canActivate');
    }
    const instanceHost = instanceWrapper.getInstanceByContextId(
      this.getContextId(contextId, instanceWrapper),
      inquirerId,
    );
    const enhancer = this.pickEnhancer<CanActivate>(
      metatype,
      instanceHost && instanceHost.instance,
      'canActivate',
    );
    // Nest constructed the bound class, and neither the instance nor the
    // class can run as a guard. A request-scoped or transient guard outside of
    // its context is only a placeholder whose constructor never ran, and a
    // class that resolves to no provider (a host outside of every module)
    // is skipped as before.
    if (instanceHost?.isConstructorCalled) {
      assertEnhancer(enhancer, 'guard', describeEnhancer(metatype));
    }
    return enhancer;
  }

  public getInstanceByMetatype(
    metatype: Type<unknown>,
  ): InstanceWrapper | undefined {
    if (!this.moduleContext) {
      return;
    }
    const collection = this.container.getModules();
    const moduleRef = collection.get(this.moduleContext);
    if (!moduleRef) {
      return;
    }
    const injectables = moduleRef.injectables;
    return injectables.get(metatype);
  }

  public getGlobalMetadata<T extends unknown[]>(
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): T {
    if (!this.config) {
      return [] as unknown[] as T;
    }
    const globalGuards = this.config.getGlobalGuards() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) {
      return globalGuards;
    }
    const scopedGuardWrappers =
      this.config.getGlobalRequestGuards() as InstanceWrapper[];
    const scopedGuards = iterate(scopedGuardWrappers)
      .map(wrapper =>
        wrapper.getInstanceByContextId(
          this.getContextId(contextId, wrapper),
          inquirerId,
        ),
      )
      .filter(host => !!host)
      .map(host => {
        // A scoped instance only exists here, once per context
        if (host.isConstructorCalled) {
          assertEnhancer(host.instance, 'guard');
        }
        return host.instance;
      })
      .toArray();

    return globalGuards.concat(scopedGuards) as T;
  }
}
