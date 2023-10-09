import {
  Logger,
  LoggerService,
  MiddlewareConsumer,
  Module,
  ModuleMetadata,
  Type,
} from '@nestjs/common';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { NestContainer } from '@nestjs/core/injector/container';
import { GraphInspector } from '@nestjs/core/inspector/graph-inspector';
import { NoopGraphInspector } from '@nestjs/core/inspector/noop-graph-inspector';
import {
  UuidFactory,
  UuidFactoryMode,
} from '@nestjs/core/inspector/uuid-factory';
import { ModuleDefinition } from '@nestjs/core/interfaces/module-definition.interface';
import { ModuleOverride } from '@nestjs/core/interfaces/module-override.interface';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { DependenciesScanner } from '@nestjs/core/scanner';
import {
  MockFactory,
  OverrideBy,
  OverrideByFactoryOptions,
} from './interfaces';
import { OverrideModule } from './interfaces/override-module.interface';
import { TestingLogger } from './services/testing-logger.service';
import { TestingInjector } from './testing-injector';
import { TestingInstanceLoader } from './testing-instance-loader';
import { TestingModule } from './testing-module';
import { OverrideMiddleware } from './interfaces/override-middleware.interface';

/**
 * @publicApi
 */
export class TestingModuleBuilder {
  private readonly applicationConfig = new ApplicationConfig();
  private readonly container = new NestContainer(this.applicationConfig);
  private readonly overloadsMap = new Map();
  private readonly moduleOverloadsMap = new Map<
    ModuleDefinition,
    ModuleDefinition
  >();
  private readonly middlewareOverloadsMap = new Map<
    Type<any> | Function,
    (Type<any> | Function)[]
  >();

  private readonly module: any;
  private testingLogger: LoggerService;
  private mocker?: MockFactory;

  constructor(
    private readonly metadataScanner: MetadataScanner,
    metadata: ModuleMetadata,
  ) {
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

  public overrideMiddleware(
    middlewareToOverride: Type<any> | Function,
  ): OverrideMiddleware {
    return {
      useMiddleware: (...newMiddleware: (Type<any> | Function)[]) => {
        this.middlewareOverloadsMap.set(middlewareToOverride, newMiddleware);
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
    this.applyMiddlewareOverrides();

    const root = this.getRootModule();
    return new TestingModule(
      this.container,
      graphInspector,
      root,
      this.applicationConfig,
    );
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

  private applyMiddlewareOverrides() {
    for (const { instance } of this.container.getModules().values()) {
      const originalConfigurationMethod = instance.configure;
      instance.configure = (middlewareConsumer: MiddlewareConsumer) => {
        if (!originalConfigurationMethod) return [];
        originalConfigurationMethod(middlewareConsumer);
        for (const [middlewareToOverride, newMiddleware] of this
          .middlewareOverloadsMap) {
          middlewareConsumer.replace(middlewareToOverride, ...newMiddleware);
        }
        return middlewareConsumer;
      };
    }
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
    return modules.next().value;
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
