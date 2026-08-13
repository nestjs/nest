import {
  DynamicModule,
  Global,
  Inject,
  Injectable,
  Module,
} from '@nestjs/common';
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

    describe('dynamic imports and regression edge cases (#17462)', () => {
      let constructionsCount = 0;
      let dynamicServiceConstructions = 0;

      @Injectable()
      class DynamicService {
        constructor() {
          dynamicServiceConstructions++;
        }
      }

      @Module({
        providers: [DynamicService],
        exports: [DynamicService],
      })
      class DynamicImportModule {}

      @Injectable()
      class ParentService {
        constructor(readonly dynamic: DynamicService) {
          constructionsCount++;
        }
      }

      @Module({})
      class LazyRootDynamicModule {
        static register(): DynamicModule {
          return {
            module: LazyRootDynamicModule,
            imports: [DynamicImportModule],
            providers: [ParentService],
            exports: [ParentService],
          };
        }
      }

      it('should load a dynamic module with pre-registered imports without skipping them', async () => {
        dynamicServiceConstructions = 0;
        constructionsCount = 0;

        const moduleRef = await lazyModuleLoader.load(() =>
          LazyRootDynamicModule.register(),
        );
        const parentService = moduleRef.get(ParentService);
        expect(parentService.dynamic).to.be.instanceOf(DynamicService);
        expect(dynamicServiceConstructions).to.equal(1);
        expect(constructionsCount).to.equal(1);
      });

      it('should not construct dynamic imports again on repeated lazy load() calls of the same dynamic module reference', async () => {
        dynamicServiceConstructions = 0;
        constructionsCount = 0;

        const dynamicModule = LazyRootDynamicModule.register();

        const moduleRef1 = await lazyModuleLoader.load(() => dynamicModule);
        const parentService1 = moduleRef1.get(ParentService);
        expect(parentService1.dynamic).to.be.instanceOf(DynamicService);
        expect(dynamicServiceConstructions).to.equal(1);
        expect(constructionsCount).to.equal(1);

        const moduleRef2 = await lazyModuleLoader.load(() => dynamicModule);
        const parentService2 = moduleRef2.get(ParentService);
        expect(parentService2).to.equal(parentService1);
        expect(dynamicServiceConstructions).to.equal(1);
        expect(constructionsCount).to.equal(1);
      });

      it('should not construct dynamic imports again on repeated lazy load() calls of distinct dynamic module configurations sharing a class-based import', async () => {
        dynamicServiceConstructions = 0;
        constructionsCount = 0;

        const moduleRef1 = await lazyModuleLoader.load(() =>
          LazyRootDynamicModule.register(),
        );
        const parentService1 = moduleRef1.get(ParentService);
        expect(parentService1.dynamic).to.be.instanceOf(DynamicService);
        expect(dynamicServiceConstructions).to.equal(1);
        expect(constructionsCount).to.equal(1);

        const moduleRef2 = await lazyModuleLoader.load(() =>
          LazyRootDynamicModule.register(),
        );
        const parentService2 = moduleRef2.get(ParentService);
        expect(parentService2).to.not.equal(parentService1); // distinct configurations!
        expect(parentService2.dynamic).to.equal(parentService1.dynamic); // sharing the singleton DynamicService!
        expect(dynamicServiceConstructions).to.equal(1); // dynamic import constructed only once
        expect(constructionsCount).to.equal(2); // parent constructed twice (distinct dynamic configurations)
      });

      it('should resolve a global provider required by a pre-registered dynamic import', async () => {
        @Global()
        @Module({
          providers: [{ provide: 'GlobalService', useValue: 'global-value' }],
          exports: ['GlobalService'],
        })
        class GlobalModule {}

        @Injectable()
        class DependentService {
          constructor(
            @Inject('GlobalService') readonly globalService: string,
          ) {}
        }

        @Module({
          providers: [DependentService],
          exports: [DependentService],
        })
        class DynamicImportModule2 {}

        @Module({})
        class LazyRootModule {
          static register(): DynamicModule {
            return {
              module: LazyRootModule,
              imports: [DynamicImportModule2],
              providers: [
                {
                  provide: 'Consumer',
                  useFactory: (dep: DependentService) => dep,
                  inject: [DependentService],
                },
              ],
            };
          }
        }

        // We boot EagerModule which imports GlobalModule
        @Module({
          imports: [GlobalModule],
        })
        class EagerModule {}

        await dependenciesScanner.scan(EagerModule);
        await instanceLoader.createInstancesOfDependencies();

        const moduleRef = await lazyModuleLoader.load(() =>
          LazyRootModule.register(),
        );
        const consumer = moduleRef.get('Consumer', { strict: false });
        expect(consumer.globalService).to.equal('global-value');
      });

      it('should handle concurrent loads of the same dynamic module reference without duplicate instances', async () => {
        dynamicServiceConstructions = 0;
        constructionsCount = 0;

        const dynamicModule = LazyRootDynamicModule.register();

        const [ref1, ref2] = await Promise.all([
          lazyModuleLoader.load(() => dynamicModule),
          lazyModuleLoader.load(() => dynamicModule),
        ]);

        const parent1 = ref1.get(ParentService);
        const parent2 = ref2.get(ParentService);
        expect(ref1).to.equal(ref2);
        expect(parent1).to.equal(parent2);
        expect(dynamicServiceConstructions).to.equal(1);
        expect(constructionsCount).to.equal(1);
      });
    });
  });
});
