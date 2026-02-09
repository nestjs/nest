import { ClassProvider, FactoryProvider } from '@nestjs/common';
import { expect } from 'chai';
import { ExternalContextCreator } from '../../../helpers/external-context-creator.js';
import { HttpAdapterHost } from '../../../helpers/http-adapter-host.js';
import { LazyModuleLoader, ModulesContainer } from '../../../injector/index.js';
import { NestContainer } from '../../../injector/container.js';
import { InternalCoreModule } from '../../../injector/internal-core-module/internal-core-module.js';
import { InternalCoreModuleFactory } from '../../../injector/internal-core-module/internal-core-module-factory.js';
import { SerializedGraph } from '../../../inspector/serialized-graph.js';

describe('InternalCoreModuleFactory', () => {
  it('should return the internal core module definition', () => {
    const moduleDefinition = InternalCoreModuleFactory.create(
      new NestContainer(),
      null!,
      null!,
      null!,
      null!,
    );

    expect(moduleDefinition.module).to.equal(InternalCoreModule);

    const providedInjectables = moduleDefinition.providers!.map(
      item => (item as ClassProvider | FactoryProvider).provide,
    );
    expect(providedInjectables).to.deep.equal([
      ExternalContextCreator,
      ModulesContainer,
      HttpAdapterHost,
      LazyModuleLoader,
      SerializedGraph,
    ]);

    const lazyModuleLoaderProvider = moduleDefinition.providers!.find(
      item => (item as FactoryProvider)?.provide === LazyModuleLoader,
    ) as FactoryProvider;
    expect(lazyModuleLoaderProvider.useFactory()).to.be.instanceOf(
      LazyModuleLoader,
    );
  });
});
