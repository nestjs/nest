import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { Controller, NestInterceptor } from '@nestjs/common/interfaces';
import { ConfigurationProvider } from '@nestjs/common/interfaces/configuration-provider.interface';
import {
  isEmpty,
  isFunction,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';
import { ContextCreator } from '../helpers/context-creator';
import { NestContainer } from '../injector/container';

export class InterceptorsContextCreator extends ContextCreator {
  private moduleContext: string;

  constructor(
    private readonly container: NestContainer,
    private readonly config?: ConfigurationProvider,
  ) {
    super();
  }

  public create(
    instance: Controller,
    callback: (...args: any[]) => any,
    module: string,
  ): NestInterceptor[] {
    this.moduleContext = module;
    return this.createContext(instance, callback, INTERCEPTORS_METADATA);
  }

  public createConcreteContext<T extends any[], R extends any[]>(
    metadata: T,
  ): R {
    if (isUndefined(metadata) || isEmpty(metadata)) {
      return [] as R;
    }
    return iterate(metadata)
      .filter(
        (interceptor: any) =>
          interceptor && (interceptor.name || interceptor.intercept),
      )
      .map(interceptor => this.getInterceptorInstance(interceptor))
      .filter(
        (interceptor: NestInterceptor) =>
          interceptor && isFunction(interceptor.intercept),
      )
      .toArray() as R;
  }

  public getInterceptorInstance(interceptor: Function | NestInterceptor) {
    const isObject = (interceptor as NestInterceptor).intercept;
    if (isObject) {
      return interceptor;
    }
    const instanceWrapper = this.getInstanceByMetatype(interceptor);
    return instanceWrapper && instanceWrapper.instance
      ? instanceWrapper.instance
      : null;
  }

  public getInstanceByMetatype<T extends Record<string, any> = any>(
    metatype: T,
  ): { instance: any } | undefined {
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

  public getGlobalMetadata<T extends any[]>(): T {
    if (!this.config) {
      return [] as T;
    }
    return this.config.getGlobalInterceptors() as T;
  }
}
