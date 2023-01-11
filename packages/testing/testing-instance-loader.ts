import { InstanceLoader } from '@nestjs/core/injector/instance-loader';
import { Module } from '@nestjs/core/injector/module';
import { MockFactory } from './interfaces';
import { TestingInjector } from './testing-injector';

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
