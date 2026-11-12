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
  /**
   * How many load() calls are building each module, and the modules that a
   * load() has built. Overlapping loads may build a shared import at the
   * same time, and a failed one must not roll back a module that another one
   * is still building or has built.
   */
  private readonly modulesInBuild = new WeakMap<Module, number>();
  private readonly builtModules = new WeakSet<Module>();

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
            !this.modulesInBuild.has(moduleInstance) &&
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
      return moduleInstance && this.getTargetModuleRef(moduleInstance);
    }
    // The scan is asynchronous, so a module that was not built yet when the
    // scan reached it may have been built by a concurrent load() since then
    const modulesToBuild = moduleInstances.filter(
      moduleInstance => !moduleInstance.isInstantiated,
    );
    if (modulesToBuild.length > 0) {
      const lazyModulesContainer =
        this.createLazyModulesContainer(modulesToBuild);
      await this.buildModules(lazyModulesContainer);
    }
    const [targetModule] = moduleInstances;
    return this.getTargetModuleRef(targetModule);
  }

  private async buildModules(lazyModulesContainer: Map<string, Module>) {
    const moduleInstances = [...lazyModulesContainer.values()];
    moduleInstances.forEach(moduleInstance =>
      this.modulesInBuild.set(
        moduleInstance,
        (this.modulesInBuild.get(moduleInstance) ?? 0) + 1,
      ),
    );
    try {
      await this.dependenciesScanner.scanModulesForDependencies(
        lazyModulesContainer,
      );
      await this.instanceLoader.createInstancesOfDependencies(
        lazyModulesContainer,
      );
      moduleInstances.forEach(moduleInstance =>
        this.builtModules.add(moduleInstance),
      );
    } catch (err) {
      // The modules that a concurrent load() builds too, or has built, are
      // left to it
      this.dependenciesScanner.removeModules(
        moduleInstances.filter(
          moduleInstance =>
            this.modulesInBuild.get(moduleInstance) === 1 &&
            !this.builtModules.has(moduleInstance),
        ),
      );
      throw err;
    } finally {
      moduleInstances.forEach(moduleInstance => {
        const count = this.modulesInBuild.get(moduleInstance)! - 1;
        if (count > 0) {
          this.modulesInBuild.set(moduleInstance, count);
        } else {
          this.modulesInBuild.delete(moduleInstance);
        }
      });
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
