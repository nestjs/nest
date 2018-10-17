import { Type } from '@nestjs/common';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { UnknownElementException } from '../errors/exceptions/unknown-element.exception';
import { InstanceWrapper, NestContainer } from './container';
import { Module } from './module';

export abstract class ModuleRef {
  private flattenModuleFixture: Partial<Module>;

  constructor(protected readonly container: NestContainer) {}

  public abstract get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    options?: { strict: boolean },
  ): TResult;

  protected find<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
  ): TResult {
    this.initFlattenModule();
    return this.findInstanceByPrototypeOrToken<TInput, TResult>(
      typeOrToken,
      this.flattenModuleFixture,
    );
  }

  protected findInstanceByPrototypeOrToken<TInput = any, TResult = TInput>(
    metatypeOrToken: Type<TInput> | string | symbol,
    contextModule: Partial<Module>,
  ): TResult {
    const dependencies = new Map([
      ...contextModule.components,
      ...contextModule.routes,
      ...contextModule.injectables,
    ]);
    const name = isFunction(metatypeOrToken)
      ? (metatypeOrToken as any).name
      : metatypeOrToken;
    const instanceWrapper = dependencies.get(name);
    if (!instanceWrapper) {
      throw new UnknownElementException();
    }
    return (instanceWrapper as InstanceWrapper<any>).instance;
  }

  private initFlattenModule() {
    if (this.flattenModuleFixture) {
      return;
    }
    const modules = this.container.getModules();
    const initialValue = {
      components: [],
      routes: [],
      injectables: [],
    };
    this.flattenModuleFixture = [...modules.values()].reduce(
      (flatten, curr) => ({
        components: [...flatten.components, ...curr.components],
        routes: [...flatten.routes, ...curr.routes],
        injectables: [...flatten.injectables, ...curr.injectables],
      }),
      initialValue,
    ) as any;
  }
}
