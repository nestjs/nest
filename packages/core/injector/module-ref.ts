import { Type } from '@nestjs/common';
import { UnknownElementException } from '../errors/exceptions/unknown-element.exception';
import { NestContainer } from './container';
import { ContainerScanner } from './container-scanner';
import { Injector } from './injector';
import { ContextId, InstanceWrapper } from './instance-wrapper';
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
  public abstract resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    contextId?: ContextId,
    options?: { strict: boolean },
  ): Promise<TResult>;
  public abstract create<T = any>(type: Type<T>): Promise<T>;

  protected find<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
  ): TResult {
    return this.containerScanner.find<TInput, TResult>(typeOrToken);
  }

  protected async instantiateClass<T = any>(
    type: Type<T>,
    moduleRef: Module,
  ): Promise<T> {
    const wrapper = new InstanceWrapper({
      name: type && type.name,
      metatype: type,
      instance: undefined,
      isResolved: false,
      host: moduleRef,
    });
    return new Promise<T>(async (resolve, reject) => {
      try {
        const callback = async (instances: any[]) => {
          const properties = await this.injector.resolveProperties(
            wrapper,
            moduleRef,
          );
          const instance = new type(...instances);
          this.injector.applyProperties(instance, properties);
          resolve(instance);
        };
        await this.injector.resolveConstructorParams<T>(
          wrapper,
          moduleRef,
          undefined,
          callback,
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  protected findInstanceByToken<TInput = any, TResult = TInput>(
    metatypeOrToken: Type<TInput> | string | symbol,
    contextModule: Module,
  ): TResult {
    return this.containerScanner.findInstanceByToken<TInput, TResult>(
      metatypeOrToken,
      contextModule,
    );
  }

  protected async resolvePerContext<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    contextModule: Module,
    contextId: ContextId,
    options?: { strict: boolean },
  ): Promise<TResult> {
    let wrapper: InstanceWrapper, collection: Map<string, InstanceWrapper>;
    if (!(options && options.strict)) {
      [wrapper, collection] = this.containerScanner.getWrapperCollectionPair(
        typeOrToken,
      );
    } else {
      [
        wrapper,
        collection,
      ] = this.containerScanner.getWrapperCollectionPairByHost(
        typeOrToken,
        contextModule,
      );
    }
    const instance = await this.injector.loadPerContext(
      wrapper.instance,
      wrapper.host,
      collection,
      contextId,
    );
    if (!instance) {
      throw new UnknownElementException();
    }
    return instance;
  }
}
