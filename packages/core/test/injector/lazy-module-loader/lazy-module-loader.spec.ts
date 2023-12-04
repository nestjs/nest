import { Global, Module } from '@nestjs/common';
import { expect } from 'chai';
import {
  LazyModuleLoader,
  ModuleRef,
  ModulesContainer,
  NestContainer,
} from '../../../injector';
import { Injector } from '../../../injector/injector';
import { InstanceLoader } from '../../../injector/instance-loader';
import { GraphInspector } from '../../../inspector/graph-inspector';
import { MetadataScanner } from '../../../metadata-scanner';
import { DependenciesScanner } from '../../../scanner';

describe('LazyModuleLoader', () => {
  let lazyModuleLoader: LazyModuleLoader;
  let dependenciesScanner: DependenciesScanner;
  let instanceLoader: InstanceLoader;
  let modulesContainer: ModulesContainer;

  class NoopLogger {
    log() {}
    error() {}
    warn() {}
  }

  @Global()
  @Module({
    providers: [
      {
        provide: 'GLOBAL',
        useValue: 'GLOBAL',
      },
    ],
    exports: ['GLOBAL'],
  })
  class SomeGlobalModule {}

  beforeEach(() => {
    const nestContainer = new NestContainer();
    const graphInspector = new GraphInspector(nestContainer);
    dependenciesScanner = new DependenciesScanner(
      nestContainer,
      new MetadataScanner(),
      graphInspector,
    );
    dependenciesScanner.scan(SomeGlobalModule);

    const injector = new Injector();
    instanceLoader = new InstanceLoader(
      nestContainer,
      injector,
      graphInspector,
      new NoopLogger(),
    );
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

    @Module({
      providers: [
        {
          provide: 'C',
          useFactory: (message: string) => message,
          inject: ['GLOBAL'],
        },
      ],
      exports: ['C'],
    })
    class ModuleC {}

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
    describe('when global modules are defined', () => {
      it('should providers of global modules are injected', async () => {
        const moduleRef = await lazyModuleLoader.load(() => ModuleC);
        expect(moduleRef.get('C')).to.be.string('GLOBAL');
      });
    });
  });
});
