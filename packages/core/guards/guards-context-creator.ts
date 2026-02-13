import { CanActivate } from '@nestjs/common';
import { iterate } from 'iterare';
import { ApplicationConfig } from '../application-config.js';
import { ContextCreator } from '../helpers/context-creator.js';
import { STATIC_CONTEXT } from '../injector/constants.js';
import { NestContainer } from '../injector/container.js';
import { InstanceWrapper } from '../injector/instance-wrapper.js';
import {
  GUARDS_METADATA,
  Controller,
  isEmpty,
  isFunction,
} from '@nestjs/common/internal';
import { Type } from '@nestjs/common';

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
      .filter((guard: any) => guard && (guard.name || guard.canActivate))
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
    const isObject = !!(metatype as CanActivate).canActivate;
    if (isObject) {
      return metatype as CanActivate;
    }
    const instanceWrapper = this.getInstanceByMetatype(
      metatype as Type<unknown>,
    );
    if (!instanceWrapper) {
      return null;
    }
    const instanceHost = instanceWrapper.getInstanceByContextId(
      this.getContextId(contextId, instanceWrapper),
      inquirerId,
    );
    return instanceHost && instanceHost.instance;
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
      .map(host => host.instance)
      .toArray();

    return globalGuards.concat(scopedGuards) as T;
  }
}
