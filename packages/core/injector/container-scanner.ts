import { Type } from '@nestjs/common';
import { Abstract } from '@nestjs/common/interfaces';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { UnknownElementException } from '../errors/exceptions/unknown-element.exception';
import { NestContainer } from './container';
import { InstanceWrapper } from './instance-wrapper';
import { Module } from './module';

export class ContainerScanner {
  private flatContainer: Partial<Module>;

  constructor(private readonly container: NestContainer) {}

  public find<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
  ): TResult {
    this.initFlatContainer();
    return this.findInstanceByPrototypeOrToken<TInput, TResult>(
      typeOrToken,
      this.flatContainer,
    );
  }

  public findInstanceByPrototypeOrToken<TInput = any, TResult = TInput>(
    metatypeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
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
      throw new UnknownElementException(name && name.toString());
    }
    return (instanceWrapper as InstanceWrapper).instance;
  }

  private initFlatContainer(): void {
    if (this.flatContainer) {
      return;
    }
    const modules = this.container.getModules();
    const initialValue: any = {
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
