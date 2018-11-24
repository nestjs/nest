import { Type } from '@nestjs/common';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { UnknownElementException } from '../errors/exceptions/unknown-element.exception';
import { InstanceWrapper, NestContainer } from './container';
import { Module } from './module';

export class ContainerScanner {
  private flatContainer: Partial<Module>;

  constructor(private readonly container: NestContainer) {}

  public find<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
  ): TResult {
    this.initFlatContainer();
    return this.findInstanceByPrototypeOrToken<TInput, TResult>(
      typeOrToken,
      this.flatContainer,
    );
  }

  public findInstanceByPrototypeOrToken<TInput = any, TResult = TInput>(
    metatypeOrToken: Type<TInput> | string | symbol,
    contextModule: Partial<Module>,
  ): TResult {
    const dependencies = new Map([
      ...contextModule.providers,
      ...contextModule.controllers,
      ...contextModule.injectables,
    ]);
    const name = isFunction(metatypeOrToken)
      ? (metatypeOrToken as Function).name
      : metatypeOrToken;
    const instanceWrapper = dependencies.get(name as string);
    if (!instanceWrapper) {
      throw new UnknownElementException();
    }
    return (instanceWrapper as InstanceWrapper<any>).instance;
  }

  private initFlatContainer() {
    if (this.flatContainer) {
      return undefined;
    }
    const modules = this.container.getModules();
    const initialValue = {
      providers: [],
      controllers: [],
      injectables: [],
    };
    const merge = <T = any>(
      initial: Map<string, T> | T[],
      arr: Map<string, T>,
    ) => [...initial, ...arr];

    this.flatContainer = ([...modules.values()].reduce(
      (current, next) => ({
        providers: merge(current.providers, next.providers),
        controllers: merge(current.controllers, next.controllers),
        injectables: merge(current.injectables, next.injectables),
      }),
      initialValue,
    ) as any) as Partial<Module>;
  }
}
