import {
  Logger,
  type LoggerService,
  Module,
  type ModuleMetadata,
} from '@nestjs/common';
import {
  MockFactory,
  OverrideBy,
  OverrideByFactoryOptions,
} from './interfaces/index.js';
import { OverrideModule } from './interfaces/override-module.interface.js';
import { TestingLogger } from './services/testing-logger.service.js';
import { TestingInjector } from './testing-injector.js';
import { TestingInstanceLoader } from './testing-instance-loader.js';
import { TestingModule } from './testing-module.js';
import type { NestApplicationContextOptions } from '@nestjs/common/internal';
import {
  ApplicationConfig,
  NestContainer,
  GraphInspector,
  type MetadataScanner,
} from '@nestjs/core';
import {
  NoopGraphInspector,
  UuidFactory,
  UuidFactoryMode,
  type ModuleDefinition,
  type ModuleOverride,
  DependenciesScanner,
} from '@nestjs/core/internal';

/**
 * @publicApi
 */
export type TestingModuleOptions = Pick<
  NestApplicationContextOptions,
  'moduleIdGeneratorAlgorithm'
>;

/**
 * @publicApi
 */
export class TestingModuleBuilder {
  private readonly applicationConfig = new ApplicationConfig();
  private readonly container: NestContainer;
  private readonly overloadsMap = new Map();
  private readonly moduleOverloadsMap = new Map<
    ModuleDefinition,
    ModuleDefinition
  >();
  private readonly module: any;
  private testingLogger: LoggerService;
  private mocker?: MockFactory;

  constructor(
    private readonly metadataScanner: MetadataScanner,
    metadata: ModuleMetadata,
    options?: TestingModuleOptions,
  ) {
    this.container = new NestContainer(this.applicationConfig, options);
    this.module = this.createModule(metadata);
  }

  public setLogger(testingLogger: LoggerService) {
    this.testingLogger = testingLogger;
    return this;
  }

  public overridePipe<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public useMocker(mocker: MockFactory): TestingModuleBuilder {
    this.mocker = mocker;
    return this;
  }

  public overrideFilter<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideGuard<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideInterceptor<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideProvider<T = any>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, true);
  }

  public overrideModule(moduleToOverride: ModuleDefinition): OverrideModule {
    return {
      useModule: newModule => {
        this.moduleOverloadsMap.set(moduleToOverride, newModule);
        return this;
      },
    };
  }

  public async compile(
    options: Pick<NestApplicationContextOptions, 'snapshot' | 'preview'> = {},
  ): Promise<TestingModule> {
    this.applyLogger();

    let graphInspector: GraphInspector;
    if (options?.snapshot) {
      graphInspector = new GraphInspector(this.container);
      UuidFactory.mode = UuidFactoryMode.Deterministic;
    } else {
      graphInspector = NoopGraphInspector;
      UuidFactory.mode = UuidFactoryMode.Random;
    }

    const scanner = new DependenciesScanner(
      this.container,
      this.metadataScanner,
      graphInspector,
      this.applicationConfig,
    );
    await scanner.scan(this.module, {
      overrides: this.getModuleOverloads(),
    });

    this.applyOverloadsMap();
    await this.createInstancesOfDependencies(graphInspector, options);
    scanner.applyApplicationProviders();

    const root = this.getRootModule();
    const testingModule = new TestingModule(
      this.container,
      graphInspector,
      root,
      this.applicationConfig,
    );
    await testingModule['preloadLazyPackages']();
    return testingModule;
  }

  private override<T = any>(typeOrToken: T, isProvider: boolean): OverrideBy {
    const addOverload = (options: any) => {
      this.overloadsMap.set(typeOrToken, {
        ...options,
        isProvider,
      });
      return this;
    };
    return this.createOverrideByBuilder(addOverload);
  }

  private createOverrideByBuilder(
    add: (provider: any) => TestingModuleBuilder,
  ): OverrideBy {
    return {
      useValue: value => add({ useValue: value }),
      useFactory: (options: OverrideByFactoryOptions) =>
        add({ ...options, useFactory: options.factory }),
      useClass: metatype => add({ useClass: metatype }),
    };
  }

  private applyOverloadsMap() {
    const overloads = [...this.overloadsMap.entries()];
    overloads.forEach(([item, options]) => {
      this.container.replace(item, options);
    });
  }

  private getModuleOverloads(): ModuleOverride[] {
    const overloads = [...this.moduleOverloadsMap.entries()];
    return overloads.map(([moduleToReplace, newModule]) => ({
      moduleToReplace,
      newModule,
    }));
  }

  private getRootModule() {
    const modules = this.container.getModules().values();
    return modules.next().value!;
  }

  private async createInstancesOfDependencies(
    graphInspector: GraphInspector,
    options: { preview?: boolean },
  ) {
    const injector = new TestingInjector({
      preview: options?.preview ?? false,
    });
    const instanceLoader = new TestingInstanceLoader(
      this.container,
      injector,
      graphInspector,
    );
    await instanceLoader.createInstancesOfDependencies(
      this.container.getModules(),
      this.mocker,
    );
  }

  private createModule(metadata: ModuleMetadata) {
    class RootTestModule {}
    Module(metadata)(RootTestModule);
    return RootTestModule;
  }

  private applyLogger() {
    Logger.overrideLogger(this.testingLogger || new TestingLogger());
  }
}
