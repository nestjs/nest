import { CanActivate } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Controller } from '@nestjs/common/interfaces';
import { ConfigurationProvider } from '@nestjs/common/interfaces/configuration-provider.interface';
import { isEmpty, isFunction, isUndefined } from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';
import { ContextCreator } from '../helpers/context-creator';
import { NestContainer } from '../injector/container';

export class GuardsContextCreator extends ContextCreator {
  private moduleContext: string;

  constructor(
    private readonly container: NestContainer,
    private readonly config?: ConfigurationProvider,
  ) {
    super();
  }

  public create(
    instance: Controller,
    callback: (...args) => any,
    module: string,
  ): CanActivate[] {
    this.moduleContext = module;
    return this.createContext(instance, callback, GUARDS_METADATA);
  }

  public createConcreteContext<T extends any[], R extends any[]>(
    metadata: T,
  ): R {
    if (isEmpty(metadata)) {
      return [] as R;
    }
    return iterate(metadata)
      .filter((guard: any) => guard && (guard.name || guard.canActivate))
      .map(guard => this.getGuardInstance(guard))
      .filter((guard: CanActivate) => guard && isFunction(guard.canActivate))
      .toArray() as R;
  }

  public getGuardInstance(guard: Function | CanActivate) {
    const isObject = (guard as CanActivate).canActivate;
    if (isObject) {
      return guard;
    }
    const instanceWrapper = this.getInstanceByMetatype(guard);
    return instanceWrapper && instanceWrapper.instance
      ? instanceWrapper.instance
      : null;
  }

  public getInstanceByMetatype(guard): { instance: any } | undefined {
    if (!this.moduleContext) {
      return undefined;
    }
    const collection = this.container.getModules();
    const module = collection.get(this.moduleContext);
    if (!module) {
      return undefined;
    }
    return module.injectables.get(guard.name);
  }

  public getGlobalMetadata<T extends any[]>(): T {
    if (!this.config) {
      return [] as T;
    }
    return this.config.getGlobalGuards() as T;
  }
}
