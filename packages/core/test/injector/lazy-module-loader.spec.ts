import { Module } from '@nestjs/common';
import { expect } from 'chai';
import {
  LazyModuleLoader,
  ModuleRef,
  ModulesContainer,
  NestContainer,
} from '../../injector';
import { InstanceLoader } from '../../injector/instance-loader';
import { MetadataScanner } from '../../metadata-scanner';
import { DependenciesScanner } from '../../scanner';

describe('LazyModuleLoader', () => {
  let lazyModuleLoader: LazyModuleLoader;
  let dependenciesScanner: DependenciesScanner;
  let instanceLoader: InstanceLoader;
  let modulesContainer: ModulesContainer;

  class NoopLogger {
    log() {}
  }

  beforeEach(() => {
    const nestContainer = new NestContainer();
    dependenciesScanner = new DependenciesScanner(
      nestContainer,
      new MetadataScanner(),
    );
    instanceLoader = new InstanceLoader(nestContainer, new NoopLogger() as any);
    modulesContainer = nestContainer.getModules();
    lazyModuleLoader = new LazyModuleLoader(
      dependenciesScanner,
      instanceLoader,
      nestContainer['moduleCompiler'],
      modulesContainer,
    );
  });
  describe('load', () => {
    const bProvider = { provide: 'B', useValue: 'B' };

    @Module({ providers: [bProvider], exports: [bProvider] })
    class ModuleB {}

    @Module({ imports: [ModuleB] })
    class ModuleA {}

    describe('when module was not loaded yet', () => {
      it('should load it and return a module reference', async () => {
        const moduleRef = await lazyModuleLoader.load(() => ModuleA);
        expect(moduleRef).to.be.instanceOf(ModuleRef);
        expect(moduleRef.get(bProvider.provide, { strict: false })).to.equal(
          bProvider.useValue,
        );
      });
    });
    describe('when module was loaded already', () => {
      @Module({})
      class ModuleC {}

      it('should return an existing module reference', async () => {
        const moduleRef = await lazyModuleLoader.load(() => ModuleC);
        const moduleRef2 = await lazyModuleLoader.load(() => ModuleC);
        expect(moduleRef).to.equal(moduleRef2);
      });
    });
  });
});
