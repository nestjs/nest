import type { DynamicModule, Type } from '@nestjs/common';
import { ModuleOverride } from '../../interfaces/module-override.interface.js';
import { DependenciesScanner } from '../../scanner.js';
import { ModuleCompiler } from '../compiler.js';
import { SilentLogger } from '../helpers/silent-logger.js';
import { InstanceLoader } from '../instance-loader.js';
import { Module } from '../module.js';
import { ModuleRef } from '../module-ref.js';
import { ModulesContainer } from '../modules-container.js';
import { LazyModuleLoaderLoadOptions } from './lazy-module-loader-options.interface.js';

export class LazyModuleLoader {
  private readonly modulesInFlight = new WeakMap<Module, Promise<void>>();

  constructor(
    private readonly dependenciesScanner: DependenciesScanner,
    private readonly instanceLoader: InstanceLoader,
    private readonly moduleCompiler: ModuleCompiler,
    private readonly modulesContainer: ModulesContainer,
    private readonly moduleOverrides?: ModuleOverride[],
  ) {}

  public async load(
    loaderFn: () =>
      Promise<Type<unknown> | DynamicModule> | Type<unknown> | DynamicModule,
    loadOpts?: LazyModuleLoaderLoadOptions,
  ): Promise<ModuleRef> {
    const moduleClassOrDynamicDefinition = await loaderFn();
    const insertedModules: Module[] = [];
    let moduleInstances: Module[];
    try {
      moduleInstances = await this.dependenciesScanner.scanForModules({
        moduleDefinition: moduleClassOrDynamicDefinition,
        overrides: this.moduleOverrides,
        lazy: true,
        insertedModules,
      });
    } catch (err) {
      // A concurrent load() may be building, or may have built, modules that
      // this scan registered. Only the ones nobody took over are rolled back.
      this.dependenciesScanner.removeModules(
        insertedModules.filter(
          moduleInstance =>
            !this.modulesInFlight.has(moduleInstance) &&
            !moduleInstance.isInstantiated,
        ),
      );
      throw err;
    }
    if (moduleInstances.length === 0) {
      // The module has been loaded already. In this case, we must
      // retrieve a module reference from the existing container.
      const { token } = await this.moduleCompiler.compile(
        moduleClassOrDynamicDefinition,
      );
      const moduleInstance = this.modulesContainer.get(token)!;
      await this.modulesInFlight.get(moduleInstance);
      return moduleInstance && this.getTargetModuleRef(moduleInstance);
    }
    // The scan is asynchronous, so a module that was not built yet when the
    // scan reached it may have been built by a concurrent load() since then
    const modulesToBuild = moduleInstances.filter(
      moduleInstance =>
        !this.modulesInFlight.has(moduleInstance) &&
        !moduleInstance.isInstantiated,
    );
    const loadsInFlight = moduleInstances.map(moduleInstance =>
      this.modulesInFlight.get(moduleInstance),
    );
    const build = this.buildModules(modulesToBuild, loadsInFlight, loadOpts);
    // Registered before any await, so a concurrent load() waits for this build.
    modulesToBuild.forEach(moduleInstance =>
      this.modulesInFlight.set(moduleInstance, build),
    );
    try {
      await build;
    } catch (err) {
      this.dependenciesScanner.removeModules(modulesToBuild);
      throw err;
    } finally {
      modulesToBuild.forEach(moduleInstance =>
        this.modulesInFlight.delete(moduleInstance),
      );
    }
    const [targetModule] = moduleInstances;
    return this.getTargetModuleRef(targetModule);
  }

  private async buildModules(
    moduleInstances: Module[],
    loadsInFlight: Array<Promise<void> | undefined>,
    loadOpts?: LazyModuleLoaderLoadOptions,
  ) {
    await Promise.all(loadsInFlight);
    if (moduleInstances.length === 0) {
      return;
    }
    const originalLogger = (this.instanceLoader as any).logger;
    try {
      this.registerLoggerConfiguration(loadOpts);

      const lazyModulesContainer =
        this.createLazyModulesContainer(moduleInstances);
      await this.dependenciesScanner.scanModulesForDependencies(
        lazyModulesContainer,
      );
      await this.instanceLoader.createInstancesOfDependencies(
        lazyModulesContainer,
      );
    } finally {
      if (loadOpts?.logger === false) {
        this.instanceLoader.setLogger(originalLogger);
      }
    }
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
