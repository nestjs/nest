import { flatten, Injectable } from '@nestjs/common';

import { InstanceWrapper } from '../injector/instance-wrapper';
import { Module } from '../injector/module';
import { ModulesContainer } from '../injector/modules-container';

/**
 * @publicApi
 */
export interface DiscoveryOptions {
  include?: Function[];
}

/**
 * @publicApi
 */
@Injectable()
export class DiscoveryService {
  constructor(private readonly modulesContainer: ModulesContainer) {}

  getProviders(
    options: DiscoveryOptions = {},
    modules: Module[] = this.getModules(options),
  ): InstanceWrapper[] {
    const providers = modules.map(item => [...item.providers.values()]);
    return flatten(providers);
  }

  getControllers(
    options: DiscoveryOptions = {},
    modules: Module[] = this.getModules(options),
  ): InstanceWrapper[] {
    const controllers = modules.map(item => [...item.controllers.values()]);
    return flatten(controllers);
  }

  protected getModules(options: DiscoveryOptions = {}): Module[] {
    if (!options.include) {
      const moduleRefs = [...this.modulesContainer.values()];
      return moduleRefs;
    }
    const whitelisted = this.includeWhitelisted(options.include);
    return whitelisted;
  }

  private includeWhitelisted(include: Function[]): Module[] {
    const moduleRefs = [...this.modulesContainer.values()];
    return moduleRefs.filter(({ metatype }) =>
      include.some(item => item === metatype),
    );
  }
}
