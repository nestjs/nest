import { InstanceLoader } from '@nestjs/core/injector/instance-loader.js';
import { Module } from '@nestjs/core/injector/module.js';
import { MockFactory } from './interfaces/index.js';
import { TestingInjector } from './testing-injector.js';

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
