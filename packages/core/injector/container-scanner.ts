import { Type } from '@nestjs/common';
import { Abstract, Scope } from '@nestjs/common/interfaces';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { InvalidClassScopeException } from '../errors/exceptions/invalid-class-scope.exception';
import { UnknownElementException } from '../errors/exceptions/unknown-element.exception';
import { NestContainer } from './container';
import { InstanceWrapper } from './instance-wrapper';
import { Module } from './module';

type HostCollection = 'providers' | 'controllers' | 'injectables';

export class ContainerScanner {
  private flatContainer: Partial<Module>;

  constructor(private readonly container: NestContainer) {}

  public find<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
  ): TResult {
    this.initFlatContainer();
    return this.findInstanceByToken<TInput, TResult>(
      typeOrToken,
      this.flatContainer,
    );
  }

  public getWrapperCollectionPair<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
  ): [InstanceWrapper<TResult>, Map<string, InstanceWrapper>] {
    this.initFlatContainer();
    return this.getWrapperCollectionPairByHost<TInput, TResult>(
      typeOrToken,
      this.flatContainer,
    );
  }

  public findInstanceByToken<TInput = any, TResult = TInput>(
    metatypeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    contextModule: Partial<Module>,
  ): TResult {
    const [instanceWrapper] = this.getWrapperCollectionPairByHost(
      metatypeOrToken,
      contextModule,
    );
    if (
      instanceWrapper.scope === Scope.REQUEST ||
      instanceWrapper.scope === Scope.TRANSIENT
    ) {
      throw new InvalidClassScopeException(metatypeOrToken);
    }
    return (instanceWrapper.instance as unknown) as TResult;
  }

  public getWrapperCollectionPairByHost<TInput = any, TResult = TInput>(
    metatypeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    contextModule: Partial<Module>,
  ): [InstanceWrapper<TResult>, Map<string, InstanceWrapper>] {
    const name = isFunction(metatypeOrToken)
      ? (metatypeOrToken as Function).name
      : metatypeOrToken;
    const collectionName = this.getHostCollection(
      name as string,
      contextModule,
    );
    const instanceWrapper = contextModule[collectionName].get(name as string);
    if (!instanceWrapper) {
      throw new UnknownElementException(name && name.toString());
    }
    return [
      instanceWrapper as InstanceWrapper<TResult>,
      contextModule[collectionName],
    ];
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

    const partialModule = ([...modules.values()].reduce(
      (current, next) => ({
        providers: merge(current.providers, next.providers),
        controllers: merge(current.controllers, next.controllers),
        injectables: merge(current.injectables, next.injectables),
      }),
      initialValue,
    ) as any) as Partial<Module>;

    this.flatContainer = {
      providers: new Map(partialModule.providers),
      controllers: new Map(partialModule.controllers),
      injectables: new Map(partialModule.injectables),
    };
  }

  private getHostCollection(
    token: string,
    { providers, controllers }: Partial<Module>,
  ): HostCollection {
    if (providers.has(token)) {
      return 'providers';
    }
    if (controllers.has(token)) {
      return 'controllers';
    }
    return 'injectables';
  }
}
