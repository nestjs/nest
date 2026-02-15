import { Logger } from '@nestjs/common';
import { ExternalContextCreator } from '../../helpers/external-context-creator.js';
import { HttpAdapterHost } from '../../helpers/http-adapter-host.js';
import { GraphInspector } from '../../inspector/graph-inspector.js';
import { InitializeOnPreviewAllowlist } from '../../inspector/initialize-on-preview.allowlist.js';
import { SerializedGraph } from '../../inspector/serialized-graph.js';
import { ModuleOverride } from '../../interfaces/module-override.interface.js';
import { DependenciesScanner } from '../../scanner.js';
import { ModuleCompiler } from '../compiler.js';
import { NestContainer } from '../container.js';
import { Injector } from '../injector.js';
import { InstanceLoader } from '../instance-loader.js';
import { LazyModuleLoader } from '../lazy-module-loader/lazy-module-loader.js';
import { ModulesContainer } from '../modules-container.js';
import { InternalCoreModule } from './internal-core-module.js';

export class InternalCoreModuleFactory {
  static create(
    container: NestContainer,
    scanner: DependenciesScanner,
    moduleCompiler: ModuleCompiler,
    httpAdapterHost: HttpAdapterHost,
    graphInspector: GraphInspector,
    moduleOverrides?: ModuleOverride[],
  ) {
    const lazyModuleLoaderFactory = () => {
      const logger = new Logger(LazyModuleLoader.name, {
        timestamp: false,
      });
      const injector = new Injector({
        preview: container.contextOptions?.preview!,
        instanceDecorator:
          container.contextOptions?.instrument?.instanceDecorator,
      });
      const instanceLoader = new InstanceLoader(
        container,
        injector,
        graphInspector,
        logger,
      );
      return new LazyModuleLoader(
        scanner,
        instanceLoader,
        moduleCompiler,
        container.getModules(),
        moduleOverrides,
      );
    };

    InitializeOnPreviewAllowlist.add(InternalCoreModule);

    return InternalCoreModule.register([
      {
        provide: ExternalContextCreator,
        useFactory: () => ExternalContextCreator.fromContainer(container),
      },
      {
        provide: ModulesContainer,
        useFactory: () => container.getModules(),
      },
      {
        provide: HttpAdapterHost,
        useFactory: () => httpAdapterHost,
      },
      {
        provide: LazyModuleLoader,
        useFactory: lazyModuleLoaderFactory,
      },
      {
        provide: SerializedGraph,
        useFactory: () => container.serializedGraph,
      },
    ]);
  }
}
