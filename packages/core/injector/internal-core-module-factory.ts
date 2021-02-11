import { Logger } from '@nestjs/common';
import { LazyModuleLoader, ModulesContainer, NestContainer } from '.';
import { HttpAdapterHost } from '..';
import { ExternalContextCreator } from '../helpers/external-context-creator';
import { DependenciesScanner } from '../scanner';
import { ModuleCompiler } from './compiler';
import { InstanceLoader } from './instance-loader';
import { InternalCoreModule } from './internal-core-module';

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
