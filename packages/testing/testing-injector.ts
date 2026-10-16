import type { NestContainer } from '@nestjs/core';
import type { ContextId } from '@nestjs/core/injector/instance-wrapper.js';
import type { Type } from '@nestjs/common';
import { isNil } from '@nestjs/common/internal';
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

  // Request-scoped and transient providers are not loaded at compile time,
  // and the injector that resolves them later has no mocker. So the mocker
  // registers their missing dependencies here, without creating instances.
  public async loadProvider(
    wrapper: InstanceWrapper,
    moduleRef: Module,
    resolutionContext: ResolutionContext = { contextId: STATIC_CONTEXT },
  ) {
    if (
      this.mocker &&
      this.shouldSkipProviderLoading(wrapper, resolutionContext)
    ) {
      // A dependency that cannot be mocked fails later, at resolve time,
      // exactly as it does without this lookup.
      await this.mockMissingDependencies(wrapper, moduleRef).catch(
        () => undefined,
      );
    }
    return super.loadProvider(wrapper, moduleRef, resolutionContext);
  }

  // Waits for every lookup, so each missing dependency is mocked
  // before compile() returns.
  private async mockMissingDependencies(
    wrapper: InstanceWrapper,
    moduleRef: Module,
  ) {
    const [dependencies] = isNil(wrapper.inject)
      ? this.getClassDependencies(wrapper)
      : this.getFactoryProviderDependencies(wrapper);
    await Promise.allSettled(
      dependencies.map((param, index) =>
        this.resolveSingleParam(
          wrapper,
          param as Type | string | symbol,
          { index, dependencies },
          moduleRef,
          { contextId: STATIC_CONTEXT },
          index,
        ),
      ),
    );
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
