import { InstanceLoader } from '@nestjs/core/injector/instance-loader';
import { NestContainer } from '@nestjs/core/injector/container';
import { OverrideByFactoryOptions, OverrideBy } from './interfaces';
import { Module } from '@nestjs/common';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { DependenciesScanner } from '@nestjs/core/scanner';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { TestingModule } from './testing-module';

export class TestingModuleBuilder {
  private readonly container = new NestContainer();
  private readonly overloadsMap = new Map();
  private readonly scanner: DependenciesScanner;
  private readonly instanceLoader = new InstanceLoader(this.container);
  private readonly module: any;

  constructor(metadataScanner: MetadataScanner, metadata: ModuleMetadata) {
    this.scanner = new DependenciesScanner(this.container, metadataScanner);
    this.module = this.createModule(metadata);
    this.scanner.scan(this.module);
  }

  public overrideGuard(typeOrToken): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideInterceptor(typeOrToken): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideComponent(typeOrToken): OverrideBy {
    return this.override(typeOrToken, true);
  }

  public async compile(): Promise<TestingModule> {
    [...this.overloadsMap.entries()].map(([component, options]) => {
      this.container.replace(component, options);
    });
    await this.instanceLoader.createInstancesOfDependencies();

    const modules = this.container.getModules().values();
    const root = modules.next().value;
    return new TestingModule(this.container, [], root);
  }

  private override(typeOrToken, isComponent: boolean): OverrideBy {
    const addOverload = options => {
      this.overloadsMap.set(typeOrToken, {
        ...options,
        isComponent
      });
      return this;
    };
    return this.createOverrideByBuilder(addOverload);
  }

  private createOverrideByBuilder(
    add: (provider) => TestingModuleBuilder
  ): OverrideBy {
    return {
      useValue: value => add({ useValue: value }),
      useFactory: (options: OverrideByFactoryOptions) =>
        add({ ...options, useFactory: options.factory }),
      useClass: metatype => add({ useClass: metatype })
    };
  }

  private createModule(metadata) {
    class TestModule {}
    Module(metadata)(TestModule);
    return TestModule;
  }
}
