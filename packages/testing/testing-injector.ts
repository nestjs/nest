import type { NestContainer } from '@nestjs/core';
import type { ContextId } from '@nestjs/core/injector/instance-wrapper.js';
import { MockFactory } from './interfaces/index.js';
import {
  STATIC_CONTEXT,
  Injector,
  type InjectorDependencyContext,
  InstanceWrapper,
  type Module,
} from '@nestjs/core/internal';

interface ResolutionContext {
  contextId: ContextId;
  inquirer?: InstanceWrapper;
  effectiveInquirerId?: string;
}

/**
 * @publicApi
 */
export class TestingInjector extends Injector {
  protected mocker?: MockFactory;
  protected container: NestContainer;

  public setMocker(mocker: MockFactory) {
    this.mocker = mocker;
  }

  public setContainer(container: NestContainer) {
    this.container = container;
  }

  public async resolveComponentWrapper<T>(
    moduleRef: Module,
    name: any,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
    keyOrIndex?: string | number,
  ): Promise<InstanceWrapper> {
    try {
      const existingProviderWrapper = await super.resolveComponentWrapper(
        moduleRef,
        name,
        dependencyContext,
        wrapper,
        resolutionContext,
        keyOrIndex,
      );
      return existingProviderWrapper;
    } catch (err) {
      return this.mockWrapper(err, moduleRef, name, wrapper);
    }
  }

  public async resolveComponentHost<T>(
    moduleRef: Module,
    instanceWrapper: InstanceWrapper<T>,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
  ): Promise<InstanceWrapper> {
    try {
      const existingProviderWrapper = await super.resolveComponentHost(
        moduleRef,
        instanceWrapper,
        resolutionContext,
      );
      return existingProviderWrapper;
    } catch (err) {
      return this.mockWrapper(
        err,
        moduleRef,
        instanceWrapper.name,
        instanceWrapper,
      );
    }
  }

  private async mockWrapper<T>(
    err: Error,
    moduleRef: Module,
    name: any,
    wrapper: InstanceWrapper<T>,
  ): Promise<InstanceWrapper> {
    if (!this.mocker) {
      throw err;
    }

    const mockedInstance = this.mocker(name);
    if (!mockedInstance) {
      throw err;
    }
    const newWrapper = new InstanceWrapper({
      name,
      isAlias: false,
      scope: wrapper.scope,
      instance: mockedInstance,
      isResolved: true,
      host: moduleRef,
      metatype: wrapper.metatype,
    });
    const internalCoreModule = this.container.getInternalCoreModuleRef();
    if (!internalCoreModule) {
      throw new Error(
        'Expected to have internal core module reference at this point.',
      );
    }

    internalCoreModule.addCustomProvider(
      {
        provide: name,
        useValue: mockedInstance,
      },
      internalCoreModule.providers,
    );
    internalCoreModule.addExportedProviderOrModule(name);
    return newWrapper;
  }
}
