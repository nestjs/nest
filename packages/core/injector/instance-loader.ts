import { Logger } from '@nestjs/common';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { MODULE_INIT_MESSAGE } from '../helpers/messages';
import { NestContainer } from './container';
import { Injector } from './injector';
import { Module } from './module';

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
    modules.forEach(module => {
      this.createPrototypesOfProviders(module);
      this.createPrototypesOfInjectables(module);
      this.createPrototypesOfControllers(module);
    });
  }

  private async createInstances(modules: Map<string, Module>) {
    await Promise.all(
      [...modules.values()].map(async module => {
        await this.createInstancesOfProviders(module);
        await this.createInstancesOfInjectables(module);
        await this.createInstancesOfControllers(module);

        const { name } = module.metatype;
        this.logger.log(MODULE_INIT_MESSAGE`${name}`);
      }),
    );
  }

  private createPrototypesOfProviders(module: Module) {
    module.providers.forEach(wrapper => {
      this.injector.loadPrototypeOfInstance<Injectable>(
        wrapper,
        module.providers,
      );
    });
  }

  private async createInstancesOfProviders(module: Module) {
    await Promise.all(
      [...module.providers.values()].map(async wrapper =>
        this.injector.loadInstanceOfComponent(wrapper, module),
      ),
    );
  }

  private createPrototypesOfControllers(module: Module) {
    module.controllers.forEach(wrapper => {
      this.injector.loadPrototypeOfInstance<Controller>(
        wrapper,
        module.controllers,
      );
    });
  }

  private async createInstancesOfControllers(module: Module) {
    await Promise.all(
      [...module.controllers.values()].map(async wrapper =>
        this.injector.loadInstanceOfController(wrapper, module),
      ),
    );
  }

  private createPrototypesOfInjectables(module: Module) {
    module.injectables.forEach(wrapper => {
      this.injector.loadPrototypeOfInstance<Controller>(
        wrapper,
        module.injectables,
      );
    });
  }

  private async createInstancesOfInjectables(module: Module) {
    await Promise.all(
      [...module.injectables.values()].map(async wrapper =>
        this.injector.loadInstanceOfInjectable(wrapper, module),
      ),
    );
  }
}
