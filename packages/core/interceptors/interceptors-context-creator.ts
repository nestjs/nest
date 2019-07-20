import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { Controller, NestInterceptor } from '@nestjs/common/interfaces';
import { isEmpty, isFunction } from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';
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
    callback: (...args: any[]) => any,
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
        (interceptor: any) =>
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
    interceptor: Function | NestInterceptor,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): NestInterceptor | null {
    const isObject = (interceptor as NestInterceptor).intercept;
    if (isObject) {
      return interceptor as NestInterceptor;
    }
    const instanceWrapper = this.getInstanceByMetatype(interceptor);
    if (!instanceWrapper) {
      return null;
    }
    const instanceHost = instanceWrapper.getInstanceByContextId(
      contextId,
      inquirerId,
    );
    return instanceHost && instanceHost.instance;
  }

  public getInstanceByMetatype<T extends Record<string, any> = any>(
    metatype: T,
  ): InstanceWrapper | undefined {
    if (!this.moduleContext) {
      return undefined;
    }
    const collection = this.container.getModules();
    const module = collection.get(this.moduleContext);
    if (!module) {
      return undefined;
    }
    return module.injectables.get(metatype.name);
  }

  public getGlobalMetadata<T extends any[]>(
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
    const scopedInterceptors = scopedInterceptorWrappers
      .map(wrapper => wrapper.getInstanceByContextId(contextId, inquirerId))
      .filter(host => host)
      .map(host => host.instance);

    return globalInterceptors.concat(scopedInterceptors) as T;
  }
}
