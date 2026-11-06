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
  let nestContainer: NestContainer;

  class NoopLogger {
    log() {}
    error() {}
    warn() {}
  }

  beforeEach(() => {
    nestContainer = new NestContainer();
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

    describe('when logger option is false', () => {
      @Module({})
      class ModuleWithLogA {}

      @Module({})
      class ModuleWithLogB {}

      it('should not permanently silence logs for subsequent load() calls', async () => {
        const logger = instanceLoader['logger'];
        const logSpy = vitest.spyOn(logger, 'log');

        await lazyModuleLoader.load(() => ModuleWithLogA, { logger: false });
        expect(logSpy).not.toHaveBeenCalled();

        await lazyModuleLoader.load(() => ModuleWithLogB);
        expect(logSpy).toHaveBeenCalled();
      });
    });

    describe('when load() is called while another load() of the module is in flight', () => {
      let requestConnection: () => Promise<string>;
      let connectionRequested: Promise<void>;
      let releaseConnection: (value: string) => void;
      let constructionsCount: number;

      @Injectable()
      class ReportsService {
        constructor(@Inject('CONNECTION') readonly connection: string) {
          constructionsCount++;
        }
      }

      @Module({
        providers: [
          {
            provide: 'CONNECTION',
            useFactory: () => requestConnection(),
          },
          ReportsService,
        ],
        exports: [ReportsService],
      })
      class ReportsModule {}

      @Module({ imports: [ReportsModule] })
      class DashboardModule {}

      // get() as soon as load() resolves: once every load settles, the
      // provider is built on master too.
      const loadReportsService = () =>
        lazyModuleLoader
          .load(() => ReportsModule)
          .then(moduleRef => moduleRef.get(ReportsService));

      beforeEach(() => {
        constructionsCount = 0;
        const connection = new Promise<string>(
          resolve => (releaseConnection = resolve),
        );
        connectionRequested = new Promise(resolve => {
          requestConnection = () => {
            resolve();
            return connection;
          };
        });
      });

      it('should return the providers after the first load() built them', async () => {
        const first = lazyModuleLoader.load(() => ReportsModule);
        await connectionRequested;
        const second = loadReportsService();
        releaseConnection('connection');

        const [, reportsService] = await Promise.all([first, second]);
        expect(reportsService.connection).toBe('connection');
        expect(constructionsCount).toBe(1);
      });

      it('should construct the providers once when both load() calls start together', async () => {
        const loads = Promise.all([loadReportsService(), loadReportsService()]);
        await connectionRequested;
        releaseConnection('connection');

        const [first, second] = await loads;
        expect(first.connection).toBe('connection');
        expect(second).toBe(first);
        expect(constructionsCount).toBe(1);
      });

      it('should wait for a load() that builds the module as an import', async () => {
        const dashboard = lazyModuleLoader.load(() => DashboardModule);
        await connectionRequested;
        const reports = loadReportsService();
        releaseConnection('connection');

        const [, reportsService] = await Promise.all([dashboard, reports]);
        expect(reportsService.connection).toBe('connection');
        expect(constructionsCount).toBe(1);
      });

      it('should restore the logger after concurrent load() calls with logger false', async () => {
        const logSpy = vitest.spyOn(instanceLoader['logger'], 'log');

        const first = lazyModuleLoader.load(() => ReportsModule, {
          logger: false,
        });
        await connectionRequested;
        const second = lazyModuleLoader.load(() => ReportsModule, {
          logger: false,
        });
        releaseConnection('connection');
        await Promise.all([first, second]);
        expect(logSpy).not.toHaveBeenCalled();

        await lazyModuleLoader.load(() => DashboardModule);
        expect(logSpy).toHaveBeenCalled();
      });
    });

    describe('when the first load() fails', () => {
      let factoryCalls: number;

      const connectionProvider = {
        provide: 'CONNECTION',
        useFactory: () => {
          factoryCalls++;
          if (factoryCalls === 1) {
            throw new Error('Connection refused');
          }
          return 'connection';
        },
      };

      @Injectable()
      class ConnectionConsumer {
        constructor(@Inject('CONNECTION') readonly connection: string) {}
      }

      @Module({ providers: [connectionProvider, ConnectionConsumer] })
      class FailingModule {}

      @Global()
      @Module({
        providers: [connectionProvider],
        exports: [connectionProvider],
      })
      class FailingGlobalModule {}

      @Module({ providers: [ConnectionConsumer] })
      class ConsumerModule {}

      @Module({ imports: [undefined as any] })
      class FailingScanModule {}

      beforeEach(() => {
        factoryCalls = 0;
      });

      it('should build the module again on the next load()', async () => {
        await expect(
          lazyModuleLoader.load(() => FailingModule),
        ).rejects.toThrow('Connection refused');
        const moduleRef = await lazyModuleLoader.load(() => FailingModule);

        expect(moduleRef.get('CONNECTION')).toBe('connection');
        expect(moduleRef.get(ConnectionConsumer).connection).toBe('connection');
        expect(factoryCalls).toBe(2);
      });

      it('should build a global module again on the next load()', async () => {
        await expect(
          lazyModuleLoader.load(() => FailingGlobalModule),
        ).rejects.toThrow('Connection refused');
        await lazyModuleLoader.load(() => FailingGlobalModule);
        const moduleRef = await lazyModuleLoader.load(() => ConsumerModule);

        expect(moduleRef.get(ConnectionConsumer).connection).toBe('connection');
      });

      it('should roll back modules if scanForModules() fails midway', async () => {
        await expect(
          lazyModuleLoader.load(() => FailingScanModule),
        ).rejects.toThrow();
        expect(modulesContainer.size).toBe(0);
      });

      it('should not evict a module that a concurrent load() still uses', async () => {
        const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
        let sharedInstances = 0;

        @Injectable()
        class SharedService {
          constructor() {
            sharedInstances++;
          }
        }

        @Module({ providers: [SharedService], exports: [SharedService] })
        class SharedModule {}

        @Module({
          imports: [SharedModule],
          providers: [
            {
              provide: 'FAIL',
              useFactory: () =>
                delay(10).then(() => Promise.reject(new Error('A failed'))),
            },
          ],
        })
        class AModule {}

        @Module({
          imports: [SharedModule],
          providers: [{ provide: 'SLOW', useFactory: () => delay(30) }],
        })
        class BModule {}

        const [a, b] = await Promise.allSettled([
          lazyModuleLoader.load(() => AModule),
          lazyModuleLoader.load(() => BModule),
        ]);
        expect(a.status).toBe('rejected');
        expect(b.status).toBe('fulfilled');
        const instancesBefore = sharedInstances;

        await lazyModuleLoader.load(() => SharedModule);

        expect(sharedInstances).toBe(instancesBefore);
      });

      it('should allow a retry after a failure while another load is in flight', async () => {
        let xCalls = 0;
        const xProvider = {
          provide: 'X_PROVIDER',
          useFactory: () => {
            xCalls++;
            if (xCalls === 1) {
              throw new Error('X failed');
            }
            return 'x_value';
          },
        };

        @Module({ providers: [xProvider], exports: [xProvider] })
        class XModule {}

        @Module({
          imports: [XModule],
          providers: [
            {
              provide: 'Z_PROVIDER',
              useFactory: () => new Promise(resolve => setTimeout(resolve, 20)),
            },
          ],
        })
        class ZModule {}

        const p1 = lazyModuleLoader.load(() => XModule);
        const p2 = lazyModuleLoader.load(() => ZModule);

        await expect(p1).rejects.toThrow('X failed');
        // Start retry immediately from first rejection
        const retry = await lazyModuleLoader.load(() => XModule);
        expect(retry.get('X_PROVIDER')).toBe('x_value');

        await expect(p2).rejects.toThrow('X failed');
        // Ensure retry module ref is still healthy and in container
        const retryAfter = await lazyModuleLoader.load(() => XModule);
        expect(retryAfter).toBe(retry);
      });

      it('should roll back an overridden module when its load fails', async () => {
        let overriddenCalls = 0;
        const failingProvider = {
          provide: 'FAILING_OVERRIDE',
          useFactory: () => {
            overriddenCalls++;
            if (overriddenCalls === 1) {
              throw new Error('Override failed');
            }
            return 'override_value';
          },
        };

        @Module({})
        class OriginalModule {}

        @Module({ providers: [failingProvider], exports: [failingProvider] })
        class OverriddenModule {}

        const overriddenLoader = new LazyModuleLoader(
          dependenciesScanner,
          instanceLoader,
          nestContainer['moduleCompiler'],
          modulesContainer,
          [{ moduleToReplace: OriginalModule, newModule: OverriddenModule }],
        );

        await expect(
          overriddenLoader.load(() => OriginalModule),
        ).rejects.toThrow('Override failed');

        const moduleRef = await overriddenLoader.load(() => OriginalModule);
        expect(moduleRef.get('FAILING_OVERRIDE')).toBe('override_value');
        expect(overriddenCalls).toBe(2);
      });

      it('should unlink a failed global module from another module loaded concurrently', async () => {
        const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

        @Global()
        @Module({
          providers: [
            {
              provide: 'FAILING_GLOBAL',
              useFactory: () =>
                delay(10).then(() =>
                  Promise.reject(new Error('Global failed')),
                ),
            },
          ],
          exports: ['FAILING_GLOBAL'],
        })
        class FailingGlobalMod {}

        @Module({
          providers: [
            {
              provide: 'OTHER_PROVIDER',
              useFactory: () => delay(20).then(() => 'other_value'),
            },
          ],
        })
        class OtherMod {}

        const [globalResult, otherResult] = await Promise.allSettled([
          lazyModuleLoader.load(() => FailingGlobalMod),
          lazyModuleLoader.load(() => OtherMod),
        ]);

        expect(globalResult.status).toBe('rejected');
        expect(otherResult.status).toBe('fulfilled');

        const { token: otherToken } =
          await nestContainer['moduleCompiler'].compile(OtherMod);
        const otherModuleInstance = modulesContainer.get(otherToken)!;

        const { token: globalToken } =
          await nestContainer['moduleCompiler'].compile(FailingGlobalMod);

        const hasGlobalImport = [...otherModuleInstance.imports].some(
          imported => imported.token === globalToken,
        );
        expect(hasGlobalImport).toBe(false);
      });

      it('should roll back parent module when an imported dynamic module fails to load', async () => {
        const failingDynamicModule: Promise<DynamicModule> = Promise.reject(
          new Error('Dynamic import failed'),
        );

        @Module({
          imports: [failingDynamicModule],
        })
        class ParentWithFailingDynamicImportModule {}

        await expect(
          lazyModuleLoader.load(() => ParentWithFailingDynamicImportModule),
        ).rejects.toThrow('Dynamic import failed');

        expect(modulesContainer.size).toBe(0);
      });

      it('should roll back parent and slow sibling when another dynamic import fails to load', async () => {
        const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

        @Module({})
        class SlowSiblingModule {}

        const slowPromise: Promise<DynamicModule> = delay(30).then(() => ({
          module: SlowSiblingModule,
        }));
        const failingPromise: Promise<DynamicModule> = Promise.reject(
          new Error('Dynamic import failed'),
        );

        @Module({
          imports: [failingPromise, slowPromise],
        })
        class ParentWithMixedDynamicImportsModule {}

        await expect(
          lazyModuleLoader.load(() => ParentWithMixedDynamicImportsModule),
        ).rejects.toThrow('Dynamic import failed');

        await delay(50);

        expect(modulesContainer.size).toBe(0);
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
        expect(moduleRef.get(ParentService).items).toEqual(['itemA', 'itemB']);
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
        expect(second.get(ParentService).items).toEqual(['itemA', 'itemB']);
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
