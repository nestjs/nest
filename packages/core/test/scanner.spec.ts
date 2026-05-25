import { Catch, Injectable } from '@nestjs/common';
import { GUARDS_METADATA } from '../../common/constants.js';
import { Controller } from '../../common/decorators/core/controller.decorator.js';
import { UseGuards } from '../../common/decorators/core/use-guards.decorator.js';
import { Module } from '../../common/decorators/modules/module.decorator.js';
import { Scope } from '../../common/interfaces/index.js';
import { ApplicationConfig } from '../application-config.js';
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  APP_PIPE,
} from '../constants.js';
import { InvalidClassModuleException } from '../errors/exceptions/invalid-class-module.exception.js';
import { InvalidModuleException } from '../errors/exceptions/invalid-module.exception.js';
import { UndefinedModuleException } from '../errors/exceptions/undefined-module.exception.js';
import { NestContainer } from '../injector/container.js';
import { InstanceWrapper } from '../injector/instance-wrapper.js';
import { GraphInspector } from '../inspector/graph-inspector.js';
import { ModuleOverride } from '../interfaces/module-override.interface.js';
import { MetadataScanner } from '../metadata-scanner.js';
import { DependenciesScanner } from '../scanner.js';

describe('DependenciesScanner', () => {
  class Guard {}

  @Injectable()
  class TestComponent {}

  @Catch()
  class TestExceptionFilterWithoutInjectable {}

  @Controller('')
  class TestController {}

  @Module({
    providers: [TestComponent],
    controllers: [TestController],
    exports: [TestComponent],
  })
  class BasicModule {}

  @Module({
    imports: [BasicModule],
    providers: [TestComponent],
    controllers: [TestController],
  })
  class TestModule {}

  @Module({
    imports: [undefined!],
  })
  class UndefinedModule {}

  @Module({
    imports: [null!],
  })
  class InvalidModule {}

  let scanner: DependenciesScanner;
  let untypedScanner: any;
  let container: NestContainer;
  let graphInspector: GraphInspector;

  beforeEach(() => {
    container = new NestContainer();
    graphInspector = new GraphInspector(container);

    scanner = new DependenciesScanner(
      container,
      new MetadataScanner(),
      graphInspector,
      new ApplicationConfig(),
    );
    untypedScanner = scanner as any;
    vi.spyOn(scanner, 'registerCoreModule').mockImplementation(async () => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should "insertOrOverrideModule" call twice (2 modules) container method "addModule"', async () => {
    const addModuleSpy = vi.spyOn(container, 'addModule');
    const replaceModuleSpy = vi.spyOn(container, 'replaceModule');

    await scanner.scan(TestModule);
    expect(addModuleSpy).toHaveBeenCalledTimes(2);
    expect(replaceModuleSpy).not.toHaveBeenCalled();
  });

  it('should "insertProvider" call twice (2 components) container method "addProvider"', async () => {
    const addProviderSpy = vi.spyOn(container, 'addProvider');
    const stub = vi
      .spyOn(scanner, 'insertExportedProviderOrModule')
      .mockImplementation(() => ({}) as any);

    await scanner.scan(TestModule);
    expect(addProviderSpy).toHaveBeenCalledTimes(2);
    stub.mockRestore();
  });

  it('should "insertController" call twice (2 components) container method "addController"', async () => {
    const addControllerSpy = vi.spyOn(container, 'addController');
    await scanner.scan(TestModule);
    expect(addControllerSpy).toHaveBeenCalledTimes(2);
  });

  it('should "insertExportedProviderOrModule" call once (1 component) container method "addExportedProviderOrModule"', async () => {
    const addExportedSpy = vi.spyOn(container, 'addExportedProviderOrModule');
    await scanner.scan(TestModule);
    expect(addExportedSpy).toHaveBeenCalledTimes(1);
  });

  describe('when there is modules overrides', () => {
    @Injectable()
    class OverwrittenTestComponent {}

    @Controller('')
    class OverwrittenControllerOne {}

    @Controller('')
    class OverwrittenControllerTwo {}

    @Module({
      controllers: [OverwrittenControllerOne],
      providers: [OverwrittenTestComponent],
    })
    class OverwrittenModuleOne {}

    @Module({
      controllers: [OverwrittenControllerTwo],
    })
    class OverwrittenModuleTwo {}

    @Module({
      imports: [OverwrittenModuleOne, OverwrittenModuleTwo],
    })
    class OverrideTestModule {}

    @Injectable()
    class OverrideTestComponent {}

    @Controller('')
    class OverrideControllerOne {}

    @Controller('')
    class OverrideControllerTwo {}

    @Module({
      controllers: [OverwrittenControllerOne],
      providers: [OverrideTestComponent],
    })
    class OverrideModuleOne {}

    @Module({
      controllers: [OverrideControllerTwo],
    })
    class OverrideModuleTwo {}

    const modulesToOverride: ModuleOverride[] = [
      { moduleToReplace: OverwrittenModuleOne, newModule: OverrideModuleOne },
      { moduleToReplace: OverwrittenModuleTwo, newModule: OverrideModuleTwo },
    ];

    it('should "putModule" call twice (2 modules) container method "replaceModule"', async () => {
      const replaceModuleSpy = vi.spyOn(container, 'replaceModule');
      const addModuleSpy = vi.spyOn(container, 'addModule');

      await scanner.scan(OverrideTestModule, {
        overrides: modulesToOverride,
      });

      expect(replaceModuleSpy).toHaveBeenCalledTimes(2);
      expect(addModuleSpy).toHaveBeenCalledTimes(1);
    });

    it('should "insertProvider" call once container method "addProvider"', async () => {
      const addProviderSpy = vi.spyOn(container, 'addProvider');

      await scanner.scan(OverrideTestModule);
      expect(addProviderSpy).toHaveBeenCalled();
    });

    it('should "insertController" call twice (2 components) container method "addController"', async () => {
      const addControllerSpy = vi.spyOn(container, 'addController');
      await scanner.scan(OverrideTestModule);
      expect(addControllerSpy).toHaveBeenCalledTimes(2);
    });

    it('should "putModule" call container method "replaceModule" with forwardRef() when forwardRef property exists', async () => {
      const overwrittenForwardRefSpy = vi.fn();

      @Module({})
      class OverwrittenForwardRef {}

      @Module({})
      class Overwritten {
        public static forwardRef() {
          overwrittenForwardRefSpy();
          return OverwrittenForwardRef;
        }
      }

      const overrideForwardRefSpy = vi.fn();

      @Module({})
      class OverrideForwardRef {}

      @Module({})
      class Override {
        public static forwardRef() {
          overrideForwardRefSpy();
          return OverrideForwardRef;
        }
      }

      @Module({
        imports: [Overwritten],
      })
      class OverrideForwardRefTestModule {}

      await scanner.scan(OverrideForwardRefTestModule, {
        overrides: [
          {
            moduleToReplace: Overwritten,
            newModule: Override,
          },
        ],
      });

      expect(overwrittenForwardRefSpy).toHaveBeenCalled();
      expect(overrideForwardRefSpy).toHaveBeenCalled();
    });
  });

  describe('reflectDynamicMetadata', () => {
    describe('when param has prototype', () => {
      it('should call "reflectParamInjectables" and "reflectInjectables"', () => {
        const reflectInjectables = vi
          .spyOn(scanner, 'reflectInjectables')
          .mockImplementation(() => undefined);

        const reflectParamInjectables = vi
          .spyOn(scanner, 'reflectParamInjectables')
          .mockImplementation(() => undefined);

        scanner.reflectDynamicMetadata({ prototype: true } as any, '');
        expect(reflectInjectables).toHaveBeenCalled();
        expect(reflectParamInjectables).toHaveBeenCalled();
      });
    });
    describe('when param has not prototype', () => {
      it('should not call ""reflectParamInjectables" and "reflectInjectables"', () => {
        const reflectInjectables = vi
          .spyOn(scanner, 'reflectInjectables')
          .mockImplementation(() => undefined);
        const reflectParamInjectables = vi
          .spyOn(scanner, 'reflectParamInjectables')
          .mockImplementation(() => undefined);
        scanner.reflectDynamicMetadata({} as any, '');

        expect(reflectInjectables).not.toHaveBeenCalled();
        expect(reflectParamInjectables).not.toHaveBeenCalled();
      });
    });
  });

  describe('insertInjectable', () => {
    class InjectableCls {}
    class HostCls {}

    const instanceWrapper = { id: 'random_id' };
    const token = 'token';
    const methodKey = 'methodKey';

    let addInjectableStub: ReturnType<typeof vi.fn>;
    let insertEnhancerMetadataCacheStub: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      addInjectableStub = vi
        .spyOn(untypedScanner.container, 'addInjectable')
        .mockImplementation(() => instanceWrapper);
      insertEnhancerMetadataCacheStub = vi
        .spyOn(graphInspector, 'insertEnhancerMetadataCache')
        .mockImplementation(() => undefined);
    });

    describe('when injectable is of type function', () => {
      const subtype = 'filter';
      beforeEach(() => {
        scanner.insertInjectable(
          InjectableCls,
          token,
          HostCls,
          subtype,
          methodKey,
        );
      });

      it('should call "addInjectable"', () => {
        expect(addInjectableStub).toHaveBeenCalledWith(
          InjectableCls,
          token,
          subtype,
          HostCls,
        );
      });

      it('should call "insertEnhancerMetadataCache"', () => {
        expect(insertEnhancerMetadataCacheStub).toHaveBeenCalledWith({
          moduleToken: token,
          classRef: HostCls,
          enhancerInstanceWrapper: instanceWrapper,
          targetNodeId: instanceWrapper.id,
          methodKey,
          subtype,
        });
      });
    });
    describe('when injectable is not of type function', () => {
      const injectableRef = new InjectableCls();
      const subtype = 'interceptor';

      beforeEach(() => {
        scanner.insertInjectable(
          injectableRef,
          token,
          HostCls,
          subtype,
          methodKey,
        );
      });

      it('should not call "addInjectable"', () => {
        expect(addInjectableStub).not.toHaveBeenCalled();
      });

      it('should call "insertEnhancerMetadataCache"', () => {
        expect(insertEnhancerMetadataCacheStub).toHaveBeenCalledWith({
          moduleToken: token,
          classRef: HostCls,
          enhancerRef: injectableRef,
          methodKey,
          subtype,
        });
      });
    });
  });

  class CompMethod {
    @UseGuards(Guard)
    public method() {}

    @UseGuards(Guard, Guard)
    public method2() {}
  }
  describe('reflectKeyMetadata', () => {
    it('should return undefined', () => {
      const result = scanner.reflectKeyMetadata(TestComponent, 'key', 'method');
      expect(result).toBeUndefined();
    });
    it('should return an array that consists of 1 element', () => {
      const methodKey = 'method';
      const result = scanner.reflectKeyMetadata(
        CompMethod,
        GUARDS_METADATA,
        methodKey,
      );
      expect(result).toEqual({ methodKey, metadata: [Guard] });
    });
    it('should return an array that consists of 2 elements', () => {
      const methodKey = 'method2';
      const result = scanner.reflectKeyMetadata(
        CompMethod,
        GUARDS_METADATA,
        methodKey,
      );
      expect(result).toEqual({ methodKey, metadata: [Guard, Guard] });
    });
  });

  describe('insertModule', () => {
    it('should call forwardRef() when forwardRef property exists', async () => {
      vi.spyOn(container, 'addModule').mockReturnValue({} as any);

      const module = { forwardRef: vi.fn().mockReturnValue(class {}) };
      await scanner.insertModule(module, []);

      expect(module.forwardRef).toHaveBeenCalled();
    });
    it('should throw "InvalidClassModuleException" exception when supplying a class annotated with `@Injectable()` decorator', async () => {
      vi.spyOn(container, 'addModule').mockReturnValue({} as any);

      await expect(scanner.insertModule(TestComponent, [])).rejects.toThrow(
        InvalidClassModuleException,
      );
    });
    it('should throw "InvalidClassModuleException" exception when supplying a class annotated with `@Controller()` decorator', async () => {
      vi.spyOn(container, 'addModule').mockReturnValue({} as any);

      await expect(scanner.insertModule(TestController, [])).rejects.toThrow(
        InvalidClassModuleException,
      );
    });
    it('should throw "InvalidClassModuleException" exception when supplying a class annotated with (only) `@Catch()` decorator', async () => {
      vi.spyOn(container, 'addModule').mockReturnValue({} as any);

      await expect(
        scanner.insertModule(TestExceptionFilterWithoutInjectable, []),
      ).rejects.toThrow(InvalidClassModuleException);
    });
  });

  describe('insertImport', () => {
    it('should call forwardRef() when forwardRef property exists', async () => {
      const module = { forwardRef: vi.fn().mockReturnValue({}) };

      vi.spyOn(container, 'addImport').mockReturnValue({} as any);
      await scanner.insertImport(module, [] as any, 'test');
      expect(module.forwardRef).toHaveBeenCalled();
    });
    describe('when "related" is nil', () => {
      it('should throw exception', async () => {
        let error;
        try {
          await scanner.insertImport(undefined, [] as any, 'test');
        } catch (e) {
          error = e;
        }
        expect(error).not.toBeUndefined();
      });
    });
  });

  describe('insertProvider', () => {
    const token = 'token';

    describe('when provider is not custom', () => {
      it('should call container "addProvider" with expected args', () => {
        const provider = {};
        const addProviderSpy = vi
          .spyOn(container, 'addProvider')
          .mockImplementation(() => false as any);

        scanner.insertProvider(provider as any, token);

        expect(addProviderSpy).toHaveBeenCalledWith(provider, token);
      });
    });
    describe('when provider is custom', () => {
      describe('and is global', () => {
        const provider = {
          provide: APP_INTERCEPTOR,
          useValue: true,
        };

        it('should call container "addProvider" with expected args', () => {
          const addProviderSpy = vi
            .spyOn(container, 'addProvider')
            .mockImplementation(() => false as any);

          scanner.insertProvider(provider, token);

          expect(addProviderSpy).toHaveBeenCalled();
        });
        it('should push new object to "applicationProvidersApplyMap" array', () => {
          vi.spyOn(container, 'addProvider').mockImplementation(
            () => false as any,
          );
          scanner.insertProvider(provider, token);
          const applyMap = untypedScanner.applicationProvidersApplyMap;

          expect(applyMap).toHaveLength(1);
          expect(applyMap[0].moduleKey).toEqual(token);
        });
      });
      describe('and is global and request/transient scoped', () => {
        const provider = {
          provide: APP_INTERCEPTOR,
          useValue: true,
          scope: Scope.REQUEST,
        };
        it('should call container "addInjectable" with expected args', () => {
          const addInjectableSpy = vi
            .spyOn(container, 'addInjectable')
            .mockImplementation(() => false as any);

          scanner.insertProvider(provider, token);

          expect(addInjectableSpy).toHaveBeenCalled();
        });
      });
      describe('and is not global', () => {
        const component = {
          provide: 'CUSTOM',
          useValue: true,
        };
        it('should call container "addProvider" with expected args', () => {
          const addProviderSpy = vi
            .spyOn(container, 'addProvider')
            .mockImplementation(() => false as any);

          scanner.insertProvider(component, token);

          expect(addProviderSpy).toHaveBeenCalledWith(component, token);
        });
        it('should not push new object to "applicationProvidersApplyMap" array', () => {
          expect(untypedScanner.applicationProvidersApplyMap).toHaveLength(0);

          vi.spyOn(container, 'addProvider').mockImplementation(
            () => false as any,
          );
          scanner.insertProvider(component, token);
          expect(untypedScanner.applicationProvidersApplyMap).toHaveLength(0);
        });
      });
    });
  });
  describe('applyApplicationProviders', () => {
    it('should apply each provider', () => {
      const provider = {
        moduleKey: 'moduleToken',
        providerKey: 'providerToken',
        type: APP_GUARD,
      };
      untypedScanner.applicationProvidersApplyMap = [provider];

      const expectedInstance = {};
      const instanceWrapper = {
        instance: expectedInstance,
      } as unknown as InstanceWrapper;
      vi.spyOn(container, 'getModules').mockImplementation(
        () =>
          ({
            get: () => ({
              providers: { get: () => instanceWrapper },
            }),
          }) as any,
      );

      const applySpy = vi.fn();
      vi.spyOn(scanner, 'getApplyProvidersMap').mockImplementation(() => ({
        [provider.type]: applySpy,
      }));

      const insertAttachedEnhancerStub = vi
        .spyOn(graphInspector, 'insertAttachedEnhancer')
        .mockImplementation(() => {});

      scanner.applyApplicationProviders();

      expect(applySpy).toHaveBeenCalled();
      expect(applySpy).toHaveBeenCalledWith(expectedInstance);
      expect(insertAttachedEnhancerStub).toHaveBeenCalledWith(instanceWrapper);
    });
    it('should apply each globally scoped provider', () => {
      const provider = {
        moduleKey: 'moduleToken',
        providerKey: 'providerToken',
        type: APP_GUARD,
        scope: Scope.REQUEST,
      };
      untypedScanner.applicationProvidersApplyMap = [provider];

      const expectedInstanceWrapper = new InstanceWrapper();
      vi.spyOn(container, 'getModules').mockImplementation(
        () =>
          ({
            get: () => ({
              injectables: { get: () => expectedInstanceWrapper },
            }),
          }) as any,
      );

      const applySpy = vi.fn();
      vi.spyOn(scanner, 'getApplyRequestProvidersMap').mockImplementation(
        () => ({
          [provider.type]: applySpy,
        }),
      );

      const insertAttachedEnhancerStub = vi
        .spyOn(graphInspector, 'insertAttachedEnhancer')
        .mockImplementation(() => {});

      scanner.applyApplicationProviders();

      expect(applySpy).toHaveBeenCalled();
      expect(applySpy).toHaveBeenCalledWith(expectedInstanceWrapper);
      expect(insertAttachedEnhancerStub).toHaveBeenCalledWith(
        expectedInstanceWrapper,
      );
    });
  });

  describe('addScopedEnhancersMetadata', () => {
    const provider = {
      moduleKey: 'moduleToken',
      providerKey: 'providerToken',
      type: APP_GUARD,
      scope: Scope.REQUEST,
    };

    it('should add enhancers metadata to every controller and every entry provider', () => {
      untypedScanner.applicationProvidersApplyMap = [provider];

      const instance = new InstanceWrapper({ name: 'test' });
      const controllers = new Map();
      const providers = new Map();

      const fakeController = new InstanceWrapper();
      const fakeProvider = new InstanceWrapper();

      const providerToken = 'entryProvider';
      controllers.set('test', fakeController);
      providers.set(providerToken, fakeProvider);

      vi.spyOn(container, 'getModules').mockImplementation(
        () =>
          ({
            get: () => ({
              injectables: { get: () => instance },
              controllers,
              entryProviders: Array.from(providers.values()),
            }),
            values() {
              return [this.get()];
            },
          }) as any,
      );

      const addEnhancerMetadataControllerSpy = vi.spyOn(
        fakeController,
        'addEnhancerMetadata',
      );
      const addEnhancerMetadataProviderSpy = vi.spyOn(
        fakeProvider,
        'addEnhancerMetadata',
      );
      scanner.addScopedEnhancersMetadata();

      expect(addEnhancerMetadataControllerSpy).toHaveBeenCalled();
      expect(addEnhancerMetadataControllerSpy).toHaveBeenCalledWith(instance);
      expect(addEnhancerMetadataProviderSpy).toHaveBeenCalled();
      expect(addEnhancerMetadataProviderSpy).toHaveBeenCalledWith(instance);
    });
  });

  describe('getApplyProvidersMap', () => {
    describe(`when token is ${APP_INTERCEPTOR}`, () => {
      it('call "addGlobalInterceptor"', () => {
        const addSpy = vi.spyOn(
          untypedScanner.applicationConfig,
          'addGlobalInterceptor',
        );
        scanner.getApplyProvidersMap()[APP_INTERCEPTOR](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
    describe(`when token is ${APP_GUARD}`, () => {
      it('call "addGlobalGuard"', () => {
        const addSpy = vi.spyOn(
          untypedScanner.applicationConfig,
          'addGlobalGuard',
        );
        scanner.getApplyProvidersMap()[APP_GUARD](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
    describe(`when token is ${APP_PIPE}`, () => {
      it('call "addGlobalPipe"', () => {
        const addSpy = vi.spyOn(
          untypedScanner.applicationConfig,
          'addGlobalPipe',
        );
        scanner.getApplyProvidersMap()[APP_PIPE](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
    describe(`when token is ${APP_FILTER}`, () => {
      it('call "addGlobalFilter"', () => {
        const addSpy = vi.spyOn(
          untypedScanner.applicationConfig,
          'addGlobalFilter',
        );
        scanner.getApplyProvidersMap()[APP_FILTER](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
  });
  describe('getApplyRequestProvidersMap', () => {
    describe(`when token is ${APP_INTERCEPTOR}`, () => {
      it('call "addGlobalRequestInterceptor"', () => {
        const addSpy = vi.spyOn(
          untypedScanner.applicationConfig,
          'addGlobalRequestInterceptor',
        );
        scanner.getApplyRequestProvidersMap()[APP_INTERCEPTOR](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
    describe(`when token is ${APP_GUARD}`, () => {
      it('call "addGlobalRequestGuard"', () => {
        const addSpy = vi.spyOn(
          untypedScanner.applicationConfig,
          'addGlobalRequestGuard',
        );
        scanner.getApplyRequestProvidersMap()[APP_GUARD](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
    describe(`when token is ${APP_PIPE}`, () => {
      it('call "addGlobalRequestPipe"', () => {
        const addSpy = vi.spyOn(
          untypedScanner.applicationConfig,
          'addGlobalRequestPipe',
        );
        scanner.getApplyRequestProvidersMap()[APP_PIPE](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
    describe(`when token is ${APP_FILTER}`, () => {
      it('call "addGlobalRequestFilter"', () => {
        const addSpy = vi.spyOn(
          untypedScanner.applicationConfig,
          'addGlobalRequestFilter',
        );
        scanner.getApplyRequestProvidersMap()[APP_FILTER](null);
        expect(addSpy).toHaveBeenCalled();
      });
    });
  });
  describe('scanForModules', () => {
    it('should throw an exception when the imports array includes undefined', async () => {
      try {
        await scanner.scanForModules({
          moduleDefinition: UndefinedModule,
          scope: [UndefinedModule],
        });
      } catch (exception) {
        expect(exception instanceof UndefinedModuleException).toBe(true);
      }
    });
    it('should throw an exception when the imports array includes an invalid value', async () => {
      try {
        await scanner.scanForModules({
          moduleDefinition: InvalidModule,
          scope: [InvalidModule],
        });
      } catch (exception) {
        expect(exception instanceof InvalidModuleException).toBe(true);
      }
    });
  });
});
