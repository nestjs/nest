import { DynamicModule, Type } from '@nestjs/common';
import { DependenciesScanner } from '../scanner';
import { ModuleCompiler } from './compiler';
import { InstanceLoader } from './instance-loader';
import { Module } from './module';
import { ModuleRef } from './module-ref';
import { ModulesContainer } from './modules-container';

export class LazyModuleLoader {
  constructor(
    private readonly dependenciesScanner: DependenciesScanner,
    private readonly instanceLoader: InstanceLoader,
    private readonly moduleCompiler: ModuleCompiler,
    private readonly modulesContainer: ModulesContainer,
  ) {}

  public async load(
    loaderFn: () =>
      | Promise<Type<unknown> | DynamicModule>
      | Type<unknown>
      | DynamicModule,
  ): Promise<ModuleRef> {
    const moduleClassOrDynamicDefinition = await loaderFn();
    const moduleInstances = await this.dependenciesScanner.scanForModules(
      moduleClassOrDynamicDefinition,
    );
    if (moduleInstances.length === 0) {
      // The module has been loaded already. In this case, we must
      // retrieve a module reference from the exising container.
      const { token } = await this.moduleCompiler.compile(
        moduleClassOrDynamicDefinition,
      );
      const moduleInstance = this.modulesContainer.get(token);
      return moduleInstance && this.getTargetModuleRef(moduleInstance);
    }
    const lazyModulesContainer = this.createLazyModulesContainer(
      moduleInstances,
    );
    await this.dependenciesScanner.scanModulesForDependencies(
      lazyModulesContainer,
    );
    await this.instanceLoader.createInstancesOfDependencies(
      lazyModulesContainer,
    );
    const [targetModule] = moduleInstances;
    return this.getTargetModuleRef(targetModule);
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
