import {Logger, OnModuleInit} from '@nestjs/common';
import {
  Controller
} from '@nestjs/common/interfaces/controllers/controller.interface';
import {Injectable} from '@nestjs/common/interfaces/injectable.interface';
import {isNil, isUndefined} from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';

import {ModuleInitMessage} from '../helpers/messages';

import {NestContainer} from './container';
import {Injector} from './injector';
import {Module} from './module';

export class InstanceLoader {
  private readonly injector = new Injector();
  private readonly logger = new Logger(InstanceLoader.name, true);

  constructor(private readonly container: NestContainer) {}

  public async createInstancesOfDependencies() {
    const modules = this.container.getModules();

    this.createPrototypes(modules);
    await this.createInstances(modules);
  }

  private createPrototypes(modules: Map<string, Module>) {
    modules.forEach((module) => {
      this.createPrototypesOfComponents(module);
      this.createPrototypesOfInjectables(module);
      this.createPrototypesOfRoutes(module);
    });
  }

  private async createInstances(modules: Map<string, Module>) {
    for (const module of [...modules.values()]) {
      await this.createInstancesOfComponents(module);
      await this.createInstancesOfInjectables(module);
      await this.createInstancesOfRoutes(module);

      const {name} = module.metatype;
      this.logger.log(ModuleInitMessage(name));
    }
  }

  private createPrototypesOfComponents(module: Module) {
    module.components.forEach((wrapper) => {
      this.injector.loadPrototypeOfInstance<Injectable>(wrapper,
                                                        module.components);
    });
  }

  private async createInstancesOfComponents(module: Module) {
    for (const [key, wrapper] of module.components) {
      await this.injector.loadInstanceOfComponent(wrapper, module);
    }
  }

  private createPrototypesOfRoutes(module: Module) {
    module.routes.forEach((wrapper) => {
      this.injector.loadPrototypeOfInstance<Controller>(wrapper, module.routes);
    });
  }

  private async createInstancesOfRoutes(module: Module) {
    await Promise.all([...module.routes.values() ].map(
        async (wrapper) =>
            await this.injector.loadInstanceOfRoute(wrapper, module),
        ));
  }

  private createPrototypesOfInjectables(module: Module) {
    module.injectables.forEach((wrapper) => {
      this.injector.loadPrototypeOfInstance<Controller>(wrapper,
                                                        module.injectables);
    });
  }

  private async createInstancesOfInjectables(module: Module) {
    await Promise.all([...module.injectables.values() ].map(
        async (wrapper) =>
            await this.injector.loadInstanceOfInjectable(wrapper, module),
        ));
  }
}