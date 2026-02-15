import type { InjectionToken } from '@nestjs/common';
import { Injector } from '../injector/injector.js';
import { InstanceWrapper } from '../injector/instance-wrapper.js';
import { Module } from '../injector/module.js';
import { MiddlewareContainer } from './container.js';

export class MiddlewareResolver {
  constructor(
    private readonly middlewareContainer: MiddlewareContainer,
    private readonly injector: Injector,
  ) {}

  public async resolveInstances(moduleRef: Module, moduleName: string) {
    const middlewareMap =
      this.middlewareContainer.getMiddlewareCollection(moduleName);
    const resolveInstance = async (wrapper: InstanceWrapper) =>
      this.resolveMiddlewareInstance(wrapper, middlewareMap, moduleRef);
    await Promise.all([...middlewareMap.values()].map(resolveInstance));
  }

  private async resolveMiddlewareInstance(
    wrapper: InstanceWrapper,
    middlewareMap: Map<InjectionToken, InstanceWrapper>,
    moduleRef: Module,
  ) {
    await this.injector.loadMiddleware(wrapper, middlewareMap, moduleRef);
  }
}
