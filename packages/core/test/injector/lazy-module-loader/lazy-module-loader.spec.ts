import {
  DynamicModule,
  Global,
  Inject,
  Injectable,
  Module,
} from '@nestjs/common';
import {
  LazyModuleLoader,
  ModuleRef,
  ModulesContainer,
  NestContainer,
} from '../../../injector/index.js';
import { Injector } from '../../../injector/injector.js';
import { InstanceLoader } from '../../../injector/instance-loader.js';
import { GraphInspector } from '../../../inspector/graph-inspector.js';
import { MetadataScanner } from '../../../metadata-scanner.js';
import { DependenciesScanner } from '../../../scanner.js';

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
        expect(moduleRef).toBeInstanceOf(ModuleRef);
        expect(moduleRef.get(bProvider.provide, { strict: false })).toBe(
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
        expect(moduleRef).toBe(moduleRef2);
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
        expect(lazyConsumer.shared).toBe(eagerSharedService);
        expect(constructionsCount).toBe(1);
      });

      it('should not construct the provider again on repeated load() calls', async () => {
        await lazyModuleLoader.load(() => LazyModule);
        expect(constructionsCount).toBe(1);

        await lazyModuleLoader.load(() => LazyModule);
        expect(constructionsCount).toBe(1);
      });

      it('should correctly support global modules without duplicating constructor calls', async () => {
        const lazyGlobalRef = await lazyModuleLoader.load(
          () => LazyGlobalModule,
        );
        const globalConsumer = lazyGlobalRef.get('GlobalConsumer', {
          strict: false,
        });
        expect(globalConsumer).toBe('global');
        expect(globalConstructionsCount).toBe(1);

        await lazyModuleLoader.load(() => LazyGlobalModule);
        expect(globalConstructionsCount).toBe(1);
      });
    });

    describe('dynamic modules with pre-registered dynamic imports (#17462)', () => {
      // The import must itself be a `DynamicModule` object: those are
      // pre-registered by `NestContainer#addDynamicMetadata` before the lazy
      // scan reaches them, so they look "already registered" to the scanner.
      @Module({
        providers: [{ provide: 'ITEMS', useValue: ['itemA', 'itemB'] }],
        exports: ['ITEMS'],
      })
      class ChildProviderModule {}

      @Injectable()
      class ParentService {
        constructor(@Inject('ITEMS') readonly items: string[]) {}
      }

      @Module({ providers: [ParentService], exports: [ParentService] })
      class ParentRootModule {}

      @Module({
        providers: [{ provide: 'GLOBAL_DEP', useValue: 'globalDep' }],
        exports: ['GLOBAL_DEP'],
      })
      @Global()
      class GlobalDepModule {}

      @Module({
        providers: [
          {
            provide: 'CHILD_OUT',
            useFactory: (dep: string) => `child(${dep})`,
            inject: ['GLOBAL_DEP'],
          },
        ],
        exports: ['CHILD_OUT'],
      })
      class ChildNeedsGlobalModule {}

      @Injectable()
      class GlobalHuskConsumer {
        constructor(@Inject('CHILD_OUT') readonly childOut: string) {}
      }

      @Module({
        providers: [GlobalHuskConsumer],
        exports: [GlobalHuskConsumer],
      })
      class GlobalHuskRootModule {}

      @Module({ imports: [GlobalDepModule] })
      class AppModule {}

      beforeEach(async () => {
        await dependenciesScanner.scan(AppModule);
        await instanceLoader.createInstancesOfDependencies();
      });

      it('should scan dynamic imports declared in the dynamic metadata', async () => {
        // Arrange
        const child: DynamicModule = { module: ChildProviderModule };
        const definition: DynamicModule = {
          module: ParentRootModule,
          imports: [child],
          exports: [child],
        };

        // Act
        const moduleRef = await lazyModuleLoader.load(() => definition);

        // Assert
        expect(moduleRef.get(ParentService).items).toEqual([
          'itemA',
          'itemB',
        ]);
      });

      it('should keep the module resolvable on repeated load() calls', async () => {
        // Arrange
        const child: DynamicModule = { module: ChildProviderModule };
        const definition: DynamicModule = {
          module: ParentRootModule,
          imports: [child],
          exports: [child],
        };

        // Act
        const first = await lazyModuleLoader.load(() => definition);
        const second = await lazyModuleLoader.load(() => definition);

        // Assert
        expect(first).toBe(second);
        expect(second.get(ParentService).items).toEqual([
          'itemA',
          'itemB',
        ]);
      });

      it('should bind global providers into a rescanned dynamic import', async () => {
        // Arrange
        const definition: DynamicModule = {
          module: GlobalHuskRootModule,
          imports: [{ module: ChildNeedsGlobalModule }],
        };

        // Act
        const moduleRef = await lazyModuleLoader.load(() => definition);

        // Assert
        expect(moduleRef.get(GlobalHuskConsumer).childOut).toBe(
          'child(globalDep)',
        );
      });
    });
  });
});
