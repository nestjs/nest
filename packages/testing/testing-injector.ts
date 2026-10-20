import type { InjectionToken } from '@nestjs/common';
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
  private readonly mockedInstances = new Map<InjectionToken, any>();

  public setMocker(mocker: MockFactory) {
    this.mocker = mocker;
    this.mockedInstances.clear();
  }

  public setContainer(container: NestContainer) {
    this.container = container;
  }

  // Request-scoped and transient providers are not loaded at compile time,
  // and the injector that resolves them later has no mocker. Their
  // dependencies are still looked up here, through resolveComponentWrapper(),
  // which mocks the missing ones without creating any instance.
  protected async lookupSkippedProviderDependencies(
    wrapper: InstanceWrapper,
    moduleRef: Module,
  ) {
    const lookup = super.lookupSkippedProviderDependencies(wrapper, moduleRef);
    // With a mocker, a dependency that cannot be mocked fails later, at
    // resolve time.
    return this.mocker ? lookup.catch(() => undefined) : lookup;
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
      return this.mockWrapper(err, moduleRef, name, name, wrapper);
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
        instanceWrapper.token,
        instanceWrapper,
      );
    }
  }

  private async mockWrapper<T>(
    err: Error,
    moduleRef: Module,
    name: any,
    token: InjectionToken,
    wrapper: InstanceWrapper<T>,
  ): Promise<InstanceWrapper> {
    if (!this.mocker) {
      throw err;
    }

    // Every provider that depends on the token must get the same mock,
    // the one `get()` returns.
    let mockedInstance = this.mockedInstances.get(token);
    if (!mockedInstance) {
      mockedInstance = this.mocker(name);
      if (!mockedInstance) {
        throw err;
      }
      this.mockedInstances.set(token, mockedInstance);
    }
    // The mock is a single value, so it stays static whatever the scope of
    // the provider it replaces or the provider that depends on it.
    const newWrapper = new InstanceWrapper({
      name,
      isAlias: false,
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
