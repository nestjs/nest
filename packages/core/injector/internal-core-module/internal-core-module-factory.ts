import { Logger } from '@nestjs/common';
import { ExternalContextCreator } from '../../helpers/external-context-creator';
import { HttpAdapterHost } from '../../helpers/http-adapter-host';
import { GraphInspector } from '../../inspector/graph-inspector';
import { SerializedGraph } from '../../inspector/serialized-graph';
import { ModuleOverride } from '../../interfaces/module-override.interface';
import { DependenciesScanner } from '../../scanner';
import { ModuleCompiler } from '../compiler';
import { NestContainer } from '../container';
import { Injector } from '../injector';
import { InstanceLoader } from '../instance-loader';
import { LazyModuleLoader } from '../lazy-module-loader/lazy-module-loader';
import { ModulesContainer } from '../modules-container';
import { InternalCoreModule } from './internal-core-module';

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
      const injector = new Injector();
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

    return InternalCoreModule.register([
      {
        provide: ExternalContextCreator,
        useValue: ExternalContextCreator.fromContainer(container),
      },
      {
        provide: ModulesContainer,
        useValue: container.getModules(),
      },
      {
        provide: HttpAdapterHost,
        useValue: httpAdapterHost,
      },
      {
        provide: LazyModuleLoader,
        useFactory: lazyModuleLoaderFactory,
      },
      {
        provide: SerializedGraph,
        useValue: container.serializedGraph,
      },
    ]);
  }
}
