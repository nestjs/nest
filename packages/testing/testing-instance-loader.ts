import { MockFactory } from './interfaces/index.js';
import { TestingInjector } from './testing-injector.js';
import { InstanceLoader, type Module } from '@nestjs/core/internal';

export class TestingInstanceLoader extends InstanceLoader<TestingInjector> {
  public async createInstancesOfDependencies(
    modules: Map<string, Module> = this.container.getModules(),
    mocker?: MockFactory,
  ): Promise<void> {
    this.injector.setContainer(this.container);
    mocker && this.injector.setMocker(mocker);
    await super.createInstancesOfDependencies();
  }
}
