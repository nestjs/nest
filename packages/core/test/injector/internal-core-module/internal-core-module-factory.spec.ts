import { ClassProvider, FactoryProvider } from '@nestjs/common';
import { expect } from 'chai';
import { ExternalContextCreator } from '../../../helpers/external-context-creator';
import { HttpAdapterHost } from '../../../helpers/http-adapter-host';
import { LazyModuleLoader, ModulesContainer } from '../../../injector';
import { NestContainer } from '../../../injector/container';
import { InternalCoreModule } from '../../../injector/internal-core-module/internal-core-module';
import { InternalCoreModuleFactory } from '../../../injector/internal-core-module/internal-core-module-factory';
import { SerializedGraph } from '../../../inspector/serialized-graph';

describe('InternalCoreModuleFactory', () => {
  it('should return the internal core module definition', () => {
    const moduleDefinition = InternalCoreModuleFactory.create(
      new NestContainer(),
      null,
      null,
      null,
      null,
    );

    expect(moduleDefinition.module).to.equal(InternalCoreModule);

    const providedInjectables = moduleDefinition.providers.map(
      item => (item as ClassProvider | FactoryProvider).provide,
    );
    expect(providedInjectables).to.deep.equal([
      ExternalContextCreator,
      ModulesContainer,
      HttpAdapterHost,
      LazyModuleLoader,
      SerializedGraph,
    ]);

    const lazyModuleLoaderProvider = moduleDefinition.providers.find(
      item => (item as FactoryProvider)?.provide === LazyModuleLoader,
    ) as FactoryProvider;
    expect(lazyModuleLoaderProvider.useFactory()).to.be.instanceOf(
      LazyModuleLoader,
    );
  });
});
