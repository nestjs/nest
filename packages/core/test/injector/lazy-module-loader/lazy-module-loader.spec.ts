import { Global, Injectable, Module } from '@nestjs/common';
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

  beforeEach(() => {
    const nestContainer = new NestContainer();
    const graphInspector = new GraphInspector(nestContainer);
    dependenciesScanner = new DependenciesScanner(
      nestContainer,
      new MetadataScanner(),
      graphInspector,
    );

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

    describe('singleton sharing and repeated loading (#17428)', () => {
      let constructionsCount = 0;
      let globalConstructionsCount = 0;

      @Injectable()
      class SharedService {
        constructor() {
          constructionsCount++;
        }
      }

      @Module({
        providers: [SharedService],
        exports: [SharedService],
      })
      class SharedModule {}

      @Global()
      @Module({
        providers: [
          {
            provide: 'GlobalService',
            useFactory: () => {
              globalConstructionsCount++;
              return 'global';
            },
          },
        ],
        exports: ['GlobalService'],
      })
      class GlobalSharedModule {}

      @Injectable()
      class Consumer {
        constructor(readonly shared: SharedService) {}
      }

      @Module({
        imports: [SharedModule],
        providers: [Consumer],
      })
      class LazyModule {}

      @Module({
        providers: [
          {
            provide: 'GlobalConsumer',
            useFactory: (globalService: any) => globalService,
            inject: ['GlobalService'],
          },
        ],
      })
      class LazyGlobalModule {}

      @Module({
        imports: [SharedModule, GlobalSharedModule],
      })
      class EagerModule {}

      let eagerSharedService: SharedService;

      beforeEach(async () => {
        constructionsCount = 0;
        globalConstructionsCount = 0;

        // Boot the eager graph
        await dependenciesScanner.scan(EagerModule);
        await instanceLoader.createInstancesOfDependencies();

        const { token: sharedModuleToken } = await (
          lazyModuleLoader as any
        ).moduleCompiler.compile(SharedModule);
        const sharedModuleInstance = modulesContainer.get(sharedModuleToken)!;
        eagerSharedService =
          sharedModuleInstance.getProviderByKey(SharedService).instance;
      });

      it('should share already-initialized singleton providers with lazily-loaded consumer', async () => {
        const lazyModuleRef = await lazyModuleLoader.load(() => LazyModule);
        const lazyConsumer = lazyModuleRef.get(Consumer);
        expect(lazyConsumer.shared).to.equal(eagerSharedService);
        expect(constructionsCount).to.equal(1);
      });

      it('should not construct the provider again on repeated load() calls', async () => {
        await lazyModuleLoader.load(() => LazyModule);
        expect(constructionsCount).to.equal(1);

        await lazyModuleLoader.load(() => LazyModule);
        expect(constructionsCount).to.equal(1);
      });

      it('should correctly support global modules without duplicating constructor calls', async () => {
        const lazyGlobalRef = await lazyModuleLoader.load(
          () => LazyGlobalModule,
        );
        const globalConsumer = lazyGlobalRef.get('GlobalConsumer', {
          strict: false,
        });
        expect(globalConsumer).to.equal('global');
        expect(globalConstructionsCount).to.equal(1);

        await lazyModuleLoader.load(() => LazyGlobalModule);
        expect(globalConstructionsCount).to.equal(1);
      });
    });

    describe('dynamic module imports (#17462)', () => {
      const itemsProvider = { provide: 'ITEMS', useValue: ['a', 'b'] };

      @Module({
        providers: [itemsProvider],
        exports: [itemsProvider],
      })
      class ChildProviderModule {}

      @Module({})
      class ParentRootModule {}

      const parentRootModuleDefinition = {
        module: ParentRootModule,
        imports: [{ module: ChildProviderModule }],
        providers: [
          {
            provide: 'PARENT_ITEMS',
            useFactory: (items: string[]) => items,
            inject: ['ITEMS'],
          },
        ],
      };

      it('should resolve providers exported by a dynamic import of a lazily loaded dynamic module', async () => {
        const moduleRef = await lazyModuleLoader.load(
          () => parentRootModuleDefinition,
        );
        expect(moduleRef.get('PARENT_ITEMS')).to.equal(itemsProvider.useValue);
      });

      it('should return an existing module reference on repeated load() calls', async () => {
        const moduleRef = await lazyModuleLoader.load(
          () => parentRootModuleDefinition,
        );
        const moduleRef2 = await lazyModuleLoader.load(
          () => parentRootModuleDefinition,
        );
        expect(moduleRef).to.equal(moduleRef2);
      });

      it('should resolve global providers from a dynamic import of a lazily loaded dynamic module', async () => {
        const globalProvider = { provide: 'GLOBAL_ITEMS', useValue: ['c'] };

        @Global()
        @Module({
          providers: [globalProvider],
          exports: [globalProvider],
        })
        class GlobalItemsModule {}

        @Module({ imports: [GlobalItemsModule] })
        class RootModule {}

        @Module({
          providers: [
            {
              provide: 'CHILD_GLOBAL_ITEMS',
              useFactory: (items: string[]) => items,
              inject: ['GLOBAL_ITEMS'],
            },
          ],
          exports: ['CHILD_GLOBAL_ITEMS'],
        })
        class GlobalConsumerChildModule {}

        @Module({})
        class GlobalConsumerParentModule {}

        await dependenciesScanner.scan(RootModule);
        await instanceLoader.createInstancesOfDependencies();

        const moduleRef = await lazyModuleLoader.load(() => ({
          module: GlobalConsumerParentModule,
          imports: [{ module: GlobalConsumerChildModule }],
        }));
        expect(moduleRef.get('CHILD_GLOBAL_ITEMS', { strict: false })).to.equal(
          globalProvider.useValue,
        );
      });
    });
  });
});
