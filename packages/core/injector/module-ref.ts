import { Type } from '@nestjs/common';
import { NestContainer } from './container';
import { ContainerScanner } from './container-scanner';
import { Injector } from './injector';
import { Module } from './module';

export abstract class ModuleRef {
  private readonly injector = new Injector();
  private readonly containerScanner: ContainerScanner;

  constructor(protected readonly container: NestContainer) {
    this.containerScanner = new ContainerScanner(container);
  }

  public abstract get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    options?: { strict: boolean },
  ): TResult;

  public abstract create<T = any>(type: Type<T>): Promise<T>;

  protected find<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
  ): TResult {
    return this.containerScanner.find<TInput, TResult>(typeOrToken);
  }

  protected async instantiateClass<T = any>(
    type: Type<T>,
    module: Module,
  ): Promise<T> {
    const wrapper = {
      name: type.name,
      metatype: type,
      instance: undefined,
      isResolved: false,
    };
    return new Promise<T>(async (resolve, reject) => {
      try {
        await this.injector.resolveConstructorParams<T>(
          wrapper,
          module,
          undefined,
          async instances => resolve(new type(...instances)),
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  protected findInstanceByPrototypeOrToken<TInput = any, TResult = TInput>(
    metatypeOrToken: Type<TInput> | string | symbol,
    contextModule: Partial<Module>,
  ): TResult {
    return this.containerScanner.findInstanceByPrototypeOrToken<
      TInput,
      TResult
    >(metatypeOrToken, contextModule);
  }
}
