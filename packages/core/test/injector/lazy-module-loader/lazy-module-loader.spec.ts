import {
  DynamicModule,
  Global,
  Inject,
  Injectable,
  Module,
  Type,
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

      const rejectionOf = (promise: Promise<unknown>) =>
        promise.then(
          () => {
            throw new Error('Expected a rejection');
          },
          (err: Error) => err,
        );

      beforeEach(() => {
        factoryCalls = 0;
      });

      it('should build the module again on the next load()', async () => {
        const err = await rejectionOf(
          lazyModuleLoader.load(() => FailingModule),
        );
        expect(err.message).to.equal('Connection refused');
        const moduleRef = await lazyModuleLoader.load(() => FailingModule);

        expect(moduleRef.get('CONNECTION')).to.equal('connection');
        expect(moduleRef.get(ConnectionConsumer).connection).to.equal(
          'connection',
        );
        expect(factoryCalls).to.equal(2);
      });

      it('should build a global module again on the next load()', async () => {
        const err = await rejectionOf(
          lazyModuleLoader.load(() => FailingGlobalModule),
        );
        expect(err.message).to.equal('Connection refused');
        await lazyModuleLoader.load(() => FailingGlobalModule);
        const moduleRef = await lazyModuleLoader.load(() => ConsumerModule);

        expect(moduleRef.get(ConnectionConsumer).connection).to.equal(
          'connection',
        );
      });

      it('should roll back modules if scanForModules() fails midway', async () => {
        await rejectionOf(lazyModuleLoader.load(() => FailingScanModule));
        expect(modulesContainer.size).to.equal(0);
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
        expect(a.status).to.equal('rejected');
        expect(b.status).to.equal('fulfilled');
        const instancesBefore = sharedInstances;

        await lazyModuleLoader.load(() => SharedModule);

        expect(sharedInstances).to.equal(instancesBefore);
      });

      it('should not evict a module that a concurrent load() has built', async () => {
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
                delay(30).then(() => Promise.reject(new Error('A failed'))),
            },
          ],
        })
        class AModule {}

        @Module({
          imports: [SharedModule],
          providers: [{ provide: 'SLOW', useFactory: () => delay(10) }],
        })
        class BModule {}

        const [a, b] = await Promise.allSettled([
          lazyModuleLoader.load(() => AModule),
          lazyModuleLoader.load(() => BModule),
        ]);
        expect(a.status).to.equal('rejected');
        expect(b.status).to.equal('fulfilled');
        const instancesBefore = sharedInstances;

        await lazyModuleLoader.load(() => SharedModule);

        expect(sharedInstances).to.equal(instancesBefore);
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

        expect((await rejectionOf(p1)).message).to.equal('X failed');
        // Start retry immediately from first rejection
        const retry = await lazyModuleLoader.load(() => XModule);
        expect(retry.get('X_PROVIDER')).to.equal('x_value');

        await Promise.allSettled([p2]);
        // Ensure retry module ref is still healthy and in container
        const retryAfter = await lazyModuleLoader.load(() => XModule);
        expect(retryAfter).to.equal(retry);
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

        const err = await rejectionOf(
          overriddenLoader.load(() => OriginalModule),
        );
        expect(err.message).to.equal('Override failed');

        const moduleRef = await overriddenLoader.load(() => OriginalModule);
        expect(moduleRef.get('FAILING_OVERRIDE')).to.equal('override_value');
        expect(overriddenCalls).to.equal(2);
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

        expect(globalResult.status).to.equal('rejected');
        expect(otherResult.status).to.equal('fulfilled');

        const { token: otherToken } =
          await nestContainer['moduleCompiler'].compile(OtherMod);
        const otherModuleInstance = modulesContainer.get(otherToken)!;

        const { token: globalToken } =
          await nestContainer['moduleCompiler'].compile(FailingGlobalMod);

        const hasGlobalImport = [...otherModuleInstance.imports].some(
          imported => imported.token === globalToken,
        );
        expect(hasGlobalImport).to.be.false;
      });

      it('should roll back parent module when an imported dynamic module fails to load', async () => {
        const failingDynamicModule: Promise<DynamicModule> = Promise.reject(
          new Error('Dynamic import failed'),
        );
        failingDynamicModule.catch(() => {});

        @Module({
          imports: [failingDynamicModule],
        })
        class ParentWithFailingDynamicImportModule {}

        const err = await rejectionOf(
          lazyModuleLoader.load(() => ParentWithFailingDynamicImportModule),
        );
        expect(err.message).to.equal('Dynamic import failed');

        expect(modulesContainer.size).to.equal(0);
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
        failingPromise.catch(() => {});

        @Module({
          imports: [failingPromise, slowPromise],
        })
        class ParentWithMixedDynamicImportsModule {}

        const err = await rejectionOf(
          lazyModuleLoader.load(() => ParentWithMixedDynamicImportsModule),
        );
        expect(err.message).to.equal('Dynamic import failed');

        await delay(50);

        expect(modulesContainer.size).to.equal(0);
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
        expect(moduleRef.get(ParentService).items).to.deep.equal([
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
        expect(first).to.equal(second);
        expect(second.get(ParentService).items).to.deep.equal([
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
        expect(moduleRef.get(GlobalHuskConsumer).childOut).to.equal(
          'child(globalDep)',
        );
      });
    });

    describe('when another load() builds an imported module while load() is still scanning', () => {
      let resolveSlowImport: (dynamicModule: DynamicModule) => void;
      let constructionsCount: number;

      @Injectable()
      class SessionRegistry {
        constructor() {
          constructionsCount++;
        }
      }

      @Module({ providers: [SessionRegistry], exports: [SessionRegistry] })
      class SessionsModule {}

      @Injectable()
      class DocumentsService {
        constructor(readonly sessions: SessionRegistry) {}
      }

      @Module({})
      class StorageModule {}

      // The scan of the returned module registers `SessionsModule` and then
      // waits for the second import.
      const createDocumentsModule = () => {
        @Module({
          imports: [
            SessionsModule,
            new Promise<DynamicModule>(resolve => {
              resolveSlowImport = resolve;
            }),
          ],
          providers: [DocumentsService],
        })
        class DocumentsModule {}

        return DocumentsModule;
      };

      const isRegistered = (metatype: Type<unknown>) =>
        [...modulesContainer.values()].some(
          moduleRef => moduleRef.metatype === metatype,
        );

      const untilRegistered = async (metatype: Type<unknown>) => {
        while (!isRegistered(metatype)) {
          await new Promise(resolve => setImmediate(resolve));
        }
      };

      beforeEach(() => {
        constructionsCount = 0;
      });

      it('should not build the module again', async () => {
        const documents = lazyModuleLoader.load(createDocumentsModule);
        await untilRegistered(SessionsModule);

        const sessionsModuleRef = await lazyModuleLoader.load(
          () => SessionsModule,
        );
        const sessionRegistry = sessionsModuleRef.get(SessionRegistry);
        resolveSlowImport({ module: StorageModule });

        const documentsModuleRef = await documents;
        expect(documentsModuleRef.get(DocumentsService).sessions).to.equal(
          sessionRegistry,
        );
        expect(sessionsModuleRef.get(SessionRegistry)).to.equal(
          sessionRegistry,
        );
        expect(constructionsCount).to.equal(1);
      });
    });
  });
});
