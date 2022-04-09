import { Logger } from '@nestjs/common';
import { ExternalContextCreator } from '../helpers/external-context-creator';
import { HttpAdapterHost } from '../helpers/http-adapter-host';
import { DependenciesScanner } from '../scanner';
import { ModuleCompiler } from './compiler';
import { NestContainer } from './container';
import { InstanceLoader } from './instance-loader';
import { InternalCoreModule } from './internal-core-module';
import { LazyModuleLoader } from './lazy-module-loader';
import { ModulesContainer } from './modules-container';

export class InternalCoreModuleFactory {
  static create(
    container: NestContainer,
    scanner: DependenciesScanner,
    moduleCompiler: ModuleCompiler,
    httpAdapterHost: HttpAdapterHost,
  ) {
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
        provide: HttpAdapterHost.name,
        useExisting: HttpAdapterHost,
      },
      {
        provide: LazyModuleLoader,
        useFactory: () => {
          const logger = new Logger(LazyModuleLoader.name, {
            timestamp: false,
          });
          const instanceLoader = new InstanceLoader(container, logger);
          return new LazyModuleLoader(
            scanner,
            instanceLoader,
            moduleCompiler,
            container.getModules(),
          );
        },
      },
    ]);
  }
}
