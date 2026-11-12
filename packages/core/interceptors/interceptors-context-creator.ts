import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { Controller, NestInterceptor, Type } from '@nestjs/common/interfaces';
import { isEmpty, isFunction } from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import { ApplicationConfig } from '../application-config';
import { assertEnhancer, describeEnhancer } from '../helpers/assert-enhancer';
import { ContextCreator } from '../helpers/context-creator';
import { STATIC_CONTEXT } from '../injector/constants';
import { NestContainer } from '../injector/container';
import { InstanceWrapper } from '../injector/instance-wrapper';

export class InterceptorsContextCreator extends ContextCreator {
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
  ): NestInterceptor[] {
    this.moduleContext = module;
    return this.createContext(
      instance,
      callback,
      INTERCEPTORS_METADATA,
      contextId,
      inquirerId,
    );
  }

  public createConcreteContext<T extends any[], R extends any[]>(
    metadata: T,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): R {
    if (isEmpty(metadata)) {
      return [] as any[] as R;
    }
    return iterate(metadata)
      .filter(
        interceptor =>
          interceptor &&
          (isFunction(interceptor) || isFunction(interceptor.intercept)),
      )
      .map(
        interceptor =>
          this.getInterceptorInstance(interceptor, contextId, inquirerId)!,
      )
      .filter((interceptor: NestInterceptor) =>
        interceptor ? isFunction(interceptor.intercept) : false,
      )
      .toArray() as R;
  }

  public getInterceptorInstance(
    metatype: Function | NestInterceptor,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): NestInterceptor | null {
    if (!isFunction(metatype)) {
      return metatype;
    }
    const instanceWrapper = this.getInstanceByMetatype(
      metatype as Type<unknown>,
    );
    if (!instanceWrapper) {
      return this.pickEnhancer<NestInterceptor>(metatype, null, 'intercept');
    }
    const instanceHost = instanceWrapper.getInstanceByContextId(
      this.getContextId(contextId, instanceWrapper),
      inquirerId,
    );
    const enhancer = this.pickEnhancer<NestInterceptor>(
      metatype,
      instanceHost && instanceHost.instance,
      'intercept',
    );
    // Nest constructed the bound class, and neither the instance nor the
    // class can run as a interceptor. A request-scoped or transient interceptor outside of
    // its context is only a placeholder whose constructor never ran, and a
    // class that resolves to no provider (a host outside of every module)
    // is skipped as before.
    if (instanceHost?.isConstructorCalled) {
      assertEnhancer(enhancer, 'interceptor', describeEnhancer(metatype));
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
    return moduleRef.injectables.get(metatype);
  }

  public getGlobalMetadata<T extends unknown[]>(
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): T {
    if (!this.config) {
      return [] as unknown[] as T;
    }
    const globalInterceptors = this.config.getGlobalInterceptors() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) {
      return globalInterceptors;
    }
    const scopedInterceptorWrappers =
      this.config.getGlobalRequestInterceptors() as InstanceWrapper[];
    const scopedInterceptors = iterate(scopedInterceptorWrappers)
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
          assertEnhancer(host.instance, 'interceptor');
        }
        return host.instance;
      })
      .toArray();

    return globalInterceptors.concat(scopedInterceptors) as T;
  }
}
