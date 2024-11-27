import { DynamicModule, Type } from '@nestjs/common';
import { ModuleOverride } from '../../interfaces/module-override.interface';
import { DependenciesScanner } from '../../scanner';
import { ModuleCompiler } from '../compiler';
import { SilentLogger } from '../helpers/silent-logger';
import { InstanceLoader } from '../instance-loader';
import { Module } from '../module';
import { ModuleRef } from '../module-ref';
import { ModulesContainer } from '../modules-container';
import { LazyModuleLoaderLoadOptions } from './lazy-module-loader-options.interface';

export class LazyModuleLoader {
  constructor(
    private readonly dependenciesScanner: DependenciesScanner,
    private readonly instanceLoader: InstanceLoader,
    private readonly moduleCompiler: ModuleCompiler,
    private readonly modulesContainer: ModulesContainer,
    private readonly moduleOverrides?: ModuleOverride[],
  ) {}

  public async load(
    loaderFn: () =>
      | Promise<Type<unknown> | DynamicModule>
      | Type<unknown>
      | DynamicModule,
    loadOpts?: LazyModuleLoaderLoadOptions,
  ): Promise<ModuleRef> {
    this.registerLoggerConfiguration(loadOpts);

    const moduleClassOrDynamicDefinition = await loaderFn();
    const moduleInstances = await this.dependenciesScanner.scanForModules({
      moduleDefinition: moduleClassOrDynamicDefinition,
      overrides: this.moduleOverrides,
      lazy: true,
    });
    if (moduleInstances.length === 0) {
      // The module has been loaded already. In this case, we must
      // retrieve a module reference from the existing container.
      const { token } = await this.moduleCompiler.compile(
        moduleClassOrDynamicDefinition,
      );
      const moduleInstance = this.modulesContainer.get(token)!;
      return moduleInstance && this.getTargetModuleRef(moduleInstance);
    }
    const lazyModulesContainer =
      this.createLazyModulesContainer(moduleInstances);
    await this.dependenciesScanner.scanModulesForDependencies(
      lazyModulesContainer,
    );
    await this.instanceLoader.createInstancesOfDependencies(
      lazyModulesContainer,
    );
    const [targetModule] = moduleInstances;
    return this.getTargetModuleRef(targetModule);
  }

  private registerLoggerConfiguration(loadOpts?: LazyModuleLoaderLoadOptions) {
    if (loadOpts?.logger === false) {
      this.instanceLoader.setLogger(new SilentLogger());
    }
  }

  private createLazyModulesContainer(
    moduleInstances: Module[],
  ): Map<string, Module> {
    moduleInstances = Array.from(new Set(moduleInstances));
    return new Map(moduleInstances.map(ref => [ref.token, ref]));
  }

  private getTargetModuleRef(moduleInstance: Module): ModuleRef {
    const moduleRefInstanceWrapper = moduleInstance.getProviderByKey(ModuleRef);
    return moduleRefInstanceWrapper.instance;
  }
}
