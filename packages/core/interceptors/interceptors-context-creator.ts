import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { Controller, NestInterceptor, Type } from '@nestjs/common/interfaces';
import { isEmpty, isFunction } from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import { ApplicationConfig } from '../application-config';
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
      return [] as R;
    }
    return iterate(metadata)
      .filter(
        interceptor =>
          interceptor && (interceptor.name || interceptor.intercept),
      )
      .map(interceptor =>
        this.getInterceptorInstance(interceptor, contextId, inquirerId),
      )
      .filter(
        (interceptor: NestInterceptor) =>
          interceptor && isFunction(interceptor.intercept),
      )
      .toArray() as R;
  }

  public getInterceptorInstance(
    metatype: Function | NestInterceptor,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): NestInterceptor | null {
    const isObject = (metatype as NestInterceptor).intercept;
    if (isObject) {
      return metatype as NestInterceptor;
    }
    const instanceWrapper = this.getInstanceByMetatype(
      metatype as Type<unknown>,
    );
    if (!instanceWrapper) {
      return null;
    }
    const instanceHost = instanceWrapper.getInstanceByContextId(
      contextId,
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
    return moduleRef.injectables.get(metatype);
  }

  public getGlobalMetadata<T extends unknown[]>(
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): T {
    if (!this.config) {
      return [] as T;
    }
    const globalInterceptors = this.config.getGlobalInterceptors() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) {
      return globalInterceptors;
    }
    const scopedInterceptorWrappers = this.config.getGlobalRequestInterceptors() as InstanceWrapper[];
    const scopedInterceptors = iterate(scopedInterceptorWrappers)
      .map(wrapper => wrapper.getInstanceByContextId(contextId, inquirerId))
      .filter(host => !!host)
      .map(host => host.instance)
      .toArray();

    return globalInterceptors.concat(scopedInterceptors) as T;
  }
}
