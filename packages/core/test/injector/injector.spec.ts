import { Optional } from '@nestjs/common';
import { PARAMTYPES_METADATA } from '@nestjs/common/constants.js';
import { Inject } from '../../../common/decorators/core/inject.decorator.js';
import { Injectable } from '../../../common/decorators/core/injectable.decorator.js';
import { STATIC_CONTEXT } from '../../injector/constants.js';
import { NestContainer } from '../../injector/container.js';
import { Injector, PropertyDependency } from '../../injector/injector.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { Module } from '../../injector/module.js';
import { SettlementSignal } from '../../injector/settlement-signal.js';

describe('Injector', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector();
  });

  describe('loadInstance', () => {
    @Injectable()
    class DependencyOne {}

    @Injectable()
    class DependencyTwo {}

    @Injectable()
    class MainTest {
      @Inject(DependencyOne) property: DependencyOne;

      constructor(
        public one: DependencyOne,
        @Inject(DependencyTwo) public two: DependencyTwo,
      ) {}
    }

    let moduleDeps: Module;
    let mainTest, depOne, depTwo;

    beforeEach(() => {
      moduleDeps = new Module(DependencyTwo, new NestContainer());
      mainTest = new InstanceWrapper({
        name: 'MainTest',
        token: 'MainTest',
        metatype: MainTest,
        instance: Object.create(MainTest.prototype),
        isResolved: false,
      });
      depOne = new InstanceWrapper({
        name: DependencyOne,
        token: DependencyOne,
        metatype: DependencyOne,
        instance: Object.create(DependencyOne.prototype),
        isResolved: false,
      });
      depTwo = new InstanceWrapper({
        name: DependencyTwo,
        token: DependencyTwo,
        metatype: DependencyTwo,
        instance: Object.create(DependencyTwo.prototype),
        isResolved: false,
      });
      moduleDeps.providers.set('MainTest', mainTest);
      moduleDeps.providers.set(DependencyOne, depOne);
      moduleDeps.providers.set(DependencyTwo, depTwo);
      moduleDeps.providers.set('MainTestResolved', {
        ...mainTest,
        isResolved: true,
      });
    });

    it('should create an instance of component with proper dependencies', async () => {
      await injector.loadInstance(mainTest, moduleDeps.providers, moduleDeps);
      const { instance } = moduleDeps.providers.get(
        'MainTest',
      ) as InstanceWrapper<MainTest>;

      expect(instance.one).toBeInstanceOf(DependencyOne);
      expect(instance.two).toBeInstanceOf(DependencyTwo);
      expect(instance).toBeInstanceOf(MainTest);
    });

    it('should set "isResolved" property to true after instance initialization', async () => {
      await injector.loadInstance(mainTest, moduleDeps.providers, moduleDeps);
      const { isResolved } = (
        moduleDeps.providers.get('MainTest') as InstanceWrapper<MainTest>
      ).getInstanceByContextId(STATIC_CONTEXT);
      expect(isResolved).toBe(true);
    });

    it('should throw RuntimeException when type is not stored in collection', async () => {
      await expect(
        injector.loadInstance({} as any, moduleDeps.providers, moduleDeps),
      ).rejects.toBeDefined();
    });

    it('should await done$ when "isPending"', async () => {
      const wrapper = new InstanceWrapper({
        name: 'MainTest',
        metatype: MainTest,
        instance: Object.create(MainTest.prototype),
        isResolved: false,
      });
      const host = wrapper.getInstanceByContextId(STATIC_CONTEXT);
      host.donePromise = Promise.resolve();
      host.isPending = true;

      await expect(
        injector.loadInstance(wrapper, moduleDeps.providers, moduleDeps),
      ).resolves.not.toThrow();
    });

    it('should await done$ when "isPending" and rethrow an exception (if thrown)', async () => {
      const error = new Error('Test error');
      const wrapper = new InstanceWrapper({
        name: 'MainTest',
        metatype: MainTest,
        instance: Object.create(MainTest.prototype),
        isResolved: false,
      });
      const host = wrapper.getInstanceByContextId(STATIC_CONTEXT);
      host.donePromise = Promise.resolve(error);
      host.isPending = true;

      await expect(
        injector.loadInstance(wrapper, moduleDeps.providers, moduleDeps),
      ).rejects.toThrow(error);
    });

    it('should return undefined when metatype is resolved', async () => {
      const result = await injector.loadInstance(
        new InstanceWrapper({
          name: 'MainTestResolved',
          metatype: MainTest,
          instance: Object.create(MainTest.prototype),
          isResolved: true,
        }),
        moduleDeps.providers,
        moduleDeps,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('loadPrototype', () => {
    @Injectable()
    class Test {}

    let moduleDeps: Module;
    let test;

    beforeEach(() => {
      moduleDeps = new Module(Test, new NestContainer());
      test = new InstanceWrapper({
        name: 'Test',
        token: 'Test',
        metatype: Test,
        instance: null,
        isResolved: false,
      });
      moduleDeps.providers.set('Test', test);
    });

    it('should create prototype of instance', () => {
      injector.loadPrototype(test, moduleDeps.providers);
      expect(moduleDeps.providers.get('Test')!.instance).toEqual(
        Object.create(Test.prototype),
      );
    });

    it('should return undefined when collection is nil', () => {
      const result = injector.loadPrototype(test, null!);
      expect(result).toBeUndefined();
    });

    it('should return undefined when target isResolved', () => {
      const collection = {
        get: () => ({
          getInstanceByContextId: () => ({ isResolved: true }),
          createPrototype: () => {},
        }),
      };
      const result = injector.loadPrototype(test, collection as any);
      expect(result).toBeUndefined();
    });

    it('should return undefined when "inject" is not nil', () => {
      const collection = {
        get: () => new InstanceWrapper({ inject: [] }),
      };
      const result = injector.loadPrototype(test, collection as any);
      expect(result).toBeUndefined();
    });
  });

  describe('resolveSingleParam', () => {
    it('should throw "RuntimeException" when param is undefined', async () => {
      await expect(
        injector.resolveSingleParam(
          null!,
          undefined!,
          { index: 0, dependencies: [] },
          null!,
        ),
      ).rejects.toBeDefined();
    });
  });

  describe('loadMiddleware', () => {
    let loadInstanceSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      loadInstanceSpy = vi.fn();
      injector.loadInstance = loadInstanceSpy;
    });

    it('should call "loadInstance" when instance is not resolved', async () => {
      const collection = {
        get: (...args) => ({}),
        set: (...args) => {},
      };

      await injector.loadMiddleware(
        { metatype: { name: '', prototype: {} } } as any,
        collection as any,
        null!,
      );
      expect(loadInstanceSpy).toHaveBeenCalled();
    });

    it('should not call "loadInstanceSpy" when instance is not resolved', async () => {
      const collection = {
        get: (...args) => ({
          instance: {},
        }),
        set: (...args) => {},
      };

      await injector.loadMiddleware(
        { metatype: { name: '' } } as any,
        collection as any,
        null!,
      );
      expect(loadInstanceSpy).not.toHaveBeenCalled();
    });
  });

  describe('loadController', () => {
    let loadInstance: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      loadInstance = vi.fn();
      injector.loadInstance = loadInstance;
    });

    it('should call "loadInstance" with expected arguments', async () => {
      const module = { controllers: [] };
      const wrapper = { test: 'test', getEnhancersMetadata: () => [] };

      await injector.loadController(wrapper as any, module as any);
      expect(loadInstance).toHaveBeenCalledWith(
        wrapper,
        module.controllers,
        module,
        expect.anything(),
        wrapper,
      );
    });
  });

  describe('loadInjectable', () => {
    let loadInstance: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      loadInstance = vi.fn();
      injector.loadInstance = loadInstance;
    });

    it('should call "loadInstance" with expected arguments', async () => {
      const module = { injectables: [] };
      const wrapper = { test: 'test' };

      await injector.loadInjectable(wrapper as any, module as any);
      expect(loadInstance).toHaveBeenCalledWith(
        wrapper,
        module.injectables,
        module,
        expect.anything(),
        undefined,
      );
    });
  });

  describe('lookupComponent', () => {
    let lookupComponentInImports: ReturnType<typeof vi.fn>;
    const metatype = { name: 'test', metatype: { name: 'test' } };
    const wrapper = new InstanceWrapper({
      name: 'Test',
      metatype: metatype as any,
      instance: null,
      isResolved: false,
    });
    beforeEach(() => {
      lookupComponentInImports = vi.fn();
      (injector as any).lookupComponentInImports = lookupComponentInImports;
    });

    it('should return object from collection if exists', async () => {
      const instance = { test: 3 };
      const collection = {
        has: () => true,
        get: () => instance,
      };
      const result = await injector.lookupComponent(
        collection as any,
        null!,
        { name: metatype.name, index: 0, dependencies: [] },
        wrapper,
      );
      expect(result).toBe(instance);
    });

    it('should throw an exception if recursion happens', async () => {
      const name = 'RecursionService';
      const instance = { test: 3 };
      const collection = {
        has: () => true,
        get: () => instance,
      };
      const result = injector.lookupComponent(
        collection as any,
        null!,
        { name, index: 0, dependencies: [] },
        Object.assign(wrapper, {
          name,
        }),
      );
      await expect(result).rejects.toBeDefined();
    });

    it('should call "lookupComponentInImports" when object is not in collection', async () => {
      lookupComponentInImports.mockReturnValue({});
      const collection = {
        has: () => false,
      };
      await injector.lookupComponent(
        collection as any,
        null!,
        { name: metatype.name, index: 0, dependencies: [] },
        wrapper,
      );
      expect(lookupComponentInImports).toHaveBeenCalled();
    });

    it('should throw "UnknownDependenciesException" when instanceWrapper is null and "exports" collection does not contain token', async () => {
      lookupComponentInImports.mockReturnValue(null);
      const collection = {
        has: () => false,
      };
      const module = { exports: collection };
      await expect(
        injector.lookupComponent(
          collection as any,
          module as any,
          { name: metatype.name, index: 0, dependencies: [] },
          wrapper,
        ),
      ).rejects.toBeDefined();
    });

    it('should not throw "UnknownDependenciesException" instanceWrapper is not null', async () => {
      lookupComponentInImports.mockReturnValue({});
      const collection = {
        has: () => false,
      };
      const module = { exports: collection };
      await expect(
        injector.lookupComponent(
          collection as any,
          module as any,
          { name: metatype.name, index: 0, dependencies: [] },
          wrapper,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('lookupComponentInImports', () => {
    let loadProvider: ReturnType<typeof vi.fn>;
    const metatype = { name: 'test' };
    const module = {
      relatedModules: new Map(),
    };

    beforeEach(() => {
      loadProvider = vi.fn();
      (injector as any).loadProvider = loadProvider;
    });

    it('should return null when there is no related modules', async () => {
      const result = await injector.lookupComponentInImports(
        module as any,
        'testToken',
        new InstanceWrapper(),
      );
      expect(result).toBe(null);
    });

    it('should return null when related modules do not have appropriate component', async () => {
      let moduleFixture = {
        relatedModules: new Map([
          [
            'key',
            {
              providers: {
                has: () => false,
              },
              exports: {
                has: () => true,
              },
            },
          ],
        ] as any),
      };
      await expect(
        injector.lookupComponentInImports(
          moduleFixture as any,
          metatype as any,
          null!,
        ),
      ).resolves.toBe(null);

      moduleFixture = {
        relatedModules: new Map([
          [
            'key',
            {
              providers: {
                has: () => true,
              },
              exports: {
                has: () => false,
              },
            },
          ],
        ] as any),
      };
      await expect(
        injector.lookupComponentInImports(
          moduleFixture as any,
          metatype as any,
          null!,
        ),
      ).resolves.toBe(null);
    });
  });

  describe('resolveParamToken', () => {
    let forwardRef;
    let wrapper;
    let param;

    describe('when "forwardRef" property is not nil', () => {
      beforeEach(() => {
        forwardRef = 'test';
        wrapper = {};
        param = {
          forwardRef: () => forwardRef,
        };
      });
      it('return forwardRef() result', () => {
        expect(injector.resolveParamToken(wrapper, param)).toEqual(forwardRef);
      });
      it('set wrapper "forwardRef" property to true', () => {
        injector.resolveParamToken(wrapper, param);
        expect(wrapper.forwardRef).toBe(true);
      });
    });
    describe('when "forwardRef" property is nil', () => {
      beforeEach(() => {
        forwardRef = 'test';
        wrapper = {};
        param = {};
      });
      it('set wrapper "forwardRef" property to false', () => {
        injector.resolveParamToken(wrapper, param);
        expect(wrapper.forwardRef).toBeUndefined();
      });
      it('return param', () => {
        expect(injector.resolveParamToken(wrapper, param)).toEqual(param);
      });
    });
  });

  describe('resolveComponentHost', () => {
    let module: any;
    beforeEach(() => {
      module = {
        providers: [],
      };
    });

    describe('when instanceWrapper is not resolved and does not have forward ref', () => {
      it('should call loadProvider', async () => {
        const wrapper = new InstanceWrapper({ isResolved: false });

        const loadStub = vi
          .spyOn(injector, 'loadProvider')
          .mockImplementation(() => null!);

        await injector.resolveComponentHost(module, wrapper);
        expect(loadStub).toHaveBeenCalled();
      });
      it('should not call loadProvider (isResolved)', async () => {
        const wrapper = new InstanceWrapper({ isResolved: true });
        const loadStub = vi
          .spyOn(injector, 'loadProvider')
          .mockImplementation(() => null!);

        await injector.resolveComponentHost(module, wrapper);
        expect(loadStub).not.toHaveBeenCalled();
      });
      it('should not call loadProvider (forwardRef)', async () => {
        const wrapper = new InstanceWrapper({
          isResolved: false,
          forwardRef: true,
        });
        const loadStub = vi
          .spyOn(injector, 'loadProvider')
          .mockImplementation(() => null!);

        await injector.resolveComponentHost(module, wrapper);
        expect(loadStub).not.toHaveBeenCalled();
      });
    });

    describe('when instanceWrapper has async property', () => {
      it('should await instance', async () => {
        vi.spyOn(injector, 'loadProvider').mockImplementation(() => null!);

        const instance = Promise.resolve(true);
        const wrapper = new InstanceWrapper({
          isResolved: false,
          forwardRef: true,
          async: true,
          instance,
        });

        const result = await injector.resolveComponentHost(module, wrapper);
        expect(result.instance).toBe(true);
      });
    });

    describe('when instanceWrapper has forward ref and is in non-static context', () => {
      it('should call settlementSignal.error when loadProvider throws', async () => {
        const error = new Error('Test error');
        const settlementSignal = new SettlementSignal();
        const errorSpy = vi.spyOn(settlementSignal, 'error');

        const wrapper = new InstanceWrapper({
          isResolved: false,
          forwardRef: true,
        });
        wrapper.settlementSignal = settlementSignal;

        const contextId = { id: 2 };
        const instanceHost = wrapper.getInstanceByContextId(contextId);
        instanceHost.donePromise = Promise.resolve();

        vi.spyOn(injector, 'loadProvider').mockImplementation(() =>
          Promise.reject(error),
        );

        await injector.resolveComponentHost(module, wrapper, contextId);
        await new Promise(resolve => setImmediate(resolve));

        expect(errorSpy).toHaveBeenCalledOnce();
        expect(errorSpy).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('applyProperties', () => {
    describe('when instance is not an object', () => {
      it('should return undefined', () => {
        expect(injector.applyProperties('test', [])).toBeUndefined();
      });
    });

    describe('when instance is an object', () => {
      it('should apply each not nil property', () => {
        const properties = [
          { key: 'one', instance: {} },
          { key: 'two', instance: null },
          { key: 'three', instance: true },
        ];
        const obj: Record<any, any> = {};
        injector.applyProperties(obj, properties as PropertyDependency[]);

        expect(obj.one).toEqual(properties[0].instance);
        expect(obj.two).toBeUndefined();
        expect(obj.three).toEqual(properties[2].instance);
      });
    });
  });

  describe('instantiateClass', () => {
    class TestClass {}

    describe('when context is static', () => {
      it('should instantiate class', async () => {
        const wrapper = new InstanceWrapper({ metatype: TestClass });
        await injector.instantiateClass([], wrapper, wrapper, STATIC_CONTEXT);

        expect(wrapper.instance).not.toBeUndefined();
        expect(wrapper.instance).toBeInstanceOf(TestClass);
      });
      it('should call factory', async () => {
        const wrapper = new InstanceWrapper({
          inject: [],
          metatype: (() => ({})) as any,
        });
        await injector.instantiateClass([], wrapper, wrapper, STATIC_CONTEXT);

        expect(wrapper.instance).not.toBeUndefined();
      });
    });
    describe('when context is not static', () => {
      it('should not instantiate class', async () => {
        const ctx = { id: 3 };
        const wrapper = new InstanceWrapper({ metatype: TestClass });
        await injector.instantiateClass([], wrapper, wrapper, ctx);

        expect(wrapper.instance).toBeUndefined();
        expect(wrapper.getInstanceByContextId(ctx).isResolved).toBe(true);
      });

      it('should not call factory', async () => {
        const wrapper = new InstanceWrapper({
          inject: [],
          metatype: vi.fn() as any,
        });
        await injector.instantiateClass([], wrapper, wrapper, { id: 2 });
        expect(wrapper.instance).toBeUndefined();
        expect(wrapper.metatype as any).not.toHaveBeenCalled();
      });
    });
  });

  describe('loadPerContext', () => {
    class TestClass {}

    it('should load instance per context id', async () => {
      const container = new NestContainer();
      const moduleCtor = class TestModule {};
      const ctx = STATIC_CONTEXT;
      const { moduleRef } = (await container.addModule(moduleCtor, []))!;

      moduleRef.addProvider({
        provide: TestClass,
        useClass: TestClass,
      });

      const instance = await injector.loadPerContext(
        new TestClass(),
        moduleRef,
        moduleRef.providers,
        ctx,
      );
      expect(instance).toBeInstanceOf(TestClass);
    });
  });

  describe('loadEnhancersPerContext', () => {
    it('should load enhancers per context id', async () => {
      const wrapper = new InstanceWrapper();
      wrapper.addEnhancerMetadata(
        new InstanceWrapper({
          host: new Module(class {}, new NestContainer()),
        }),
      );
      wrapper.addEnhancerMetadata(
        new InstanceWrapper({
          host: new Module(class {}, new NestContainer()),
        }),
      );

      const loadInstanceStub = vi
        .spyOn(injector, 'loadInstance')
        .mockImplementation(async () => ({}) as any);

      await injector.loadEnhancersPerContext(wrapper, STATIC_CONTEXT);
      expect(loadInstanceStub).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadCtorMetadata', () => {
    it('should resolve ctor metadata', async () => {
      const wrapper = new InstanceWrapper();
      wrapper.addCtorMetadata(0, new InstanceWrapper());
      wrapper.addCtorMetadata(1, new InstanceWrapper());

      const resolveComponentHostStub = vi
        .spyOn(injector, 'resolveComponentHost')
        .mockImplementation(async () => new InstanceWrapper());

      await injector.loadCtorMetadata(
        wrapper.getCtorMetadata(),
        STATIC_CONTEXT,
      );
      expect(resolveComponentHostStub).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadPropertiesMetadata', () => {
    it('should resolve properties metadata', async () => {
      const wrapper = new InstanceWrapper();
      wrapper.addPropertiesMetadata('key1', new InstanceWrapper());
      wrapper.addPropertiesMetadata('key2', new InstanceWrapper());

      const resolveComponentHostStub = vi
        .spyOn(injector, 'resolveComponentHost')
        .mockImplementation(async () => new InstanceWrapper());

      await injector.loadPropertiesMetadata(
        wrapper.getPropertiesMetadata(),
        STATIC_CONTEXT,
      );
      expect(resolveComponentHostStub).toHaveBeenCalledTimes(2);
    });
  });

  describe('resolveConstructorParams', () => {
    it('should call "loadCtorMetadata" if metadata is not undefined', async () => {
      const wrapper = new InstanceWrapper();
      const metadata = [];
      vi.spyOn(wrapper, 'getCtorMetadata').mockImplementation(() => metadata);

      const loadCtorMetadataSpy = vi.spyOn(injector, 'loadCtorMetadata');
      await injector.resolveConstructorParams(
        wrapper,
        null!,
        [],
        () => {
          expect(loadCtorMetadataSpy).toHaveBeenCalled();
        },
        { id: 2 },
      );
    });
  });

  describe('resolveProperties', () => {
    it('should call "loadPropertiesMetadata" if metadata is not undefined', async () => {
      const wrapper = new InstanceWrapper();
      const metadata = [];
      vi.spyOn(wrapper, 'getPropertiesMetadata').mockImplementation(
        () => metadata,
      );

      const loadPropertiesMetadataSpy = vi.spyOn(
        injector,
        'loadPropertiesMetadata',
      );
      await injector.resolveProperties(wrapper, null!, null!, { id: 2 });
      expect(loadPropertiesMetadataSpy).toHaveBeenCalled();
    });
  });

  describe('getClassDependencies', () => {
    it('should return an array that consists of deps and optional dep ids', async () => {
      class FixtureDep1 {}
      class FixtureDep2 {}

      @Injectable()
      class FixtureClass {
        constructor(
          private dep1: FixtureDep1,
          @Optional() private dep2: FixtureDep2,
        ) {}
      }

      const wrapper = new InstanceWrapper({ metatype: FixtureClass });
      const [dependencies, optionalDependenciesIds] =
        injector.getClassDependencies(wrapper);

      expect(dependencies).toEqual([FixtureDep1, FixtureDep2]);
      expect(optionalDependenciesIds).toEqual([1]);
    });

    it('should not mutate the constructor metadata', async () => {
      class FixtureDep1 {}
      /** This needs to be something other than FixtureDep1 so the test can ensure that the metadata was not mutated */
      const injectionToken = 'test_token';

      @Injectable()
      class FixtureClass {
        constructor(@Inject(injectionToken) private dep1: FixtureDep1) {}
      }

      const wrapper = new InstanceWrapper({ metatype: FixtureClass });
      const [dependencies] = injector.getClassDependencies(wrapper);
      expect(dependencies).toEqual([injectionToken]);

      const paramtypes = Reflect.getMetadata(PARAMTYPES_METADATA, FixtureClass);
      expect(paramtypes).toEqual([FixtureDep1]);
    });
  });

  describe('getFactoryProviderDependencies', () => {
    it('should return an array that consists of deps and optional dep ids', async () => {
      class FixtureDep1 {}
      class FixtureDep2 {}

      const wrapper = new InstanceWrapper({
        inject: [
          FixtureDep1,
          { token: FixtureDep2, optional: true },
          { token: FixtureDep2, optional: false },
          {} as any,
        ],
      });
      const [dependencies, optionalDependenciesIds] =
        injector.getFactoryProviderDependencies(wrapper);

      expect(dependencies).toEqual([FixtureDep1, FixtureDep2, FixtureDep2, {}]);
      expect(optionalDependenciesIds).toEqual([1]);
    });
  });

  describe('addDependencyMetadata', () => {
    interface IInjector extends Omit<Injector, 'addDependencyMetadata'> {
      addDependencyMetadata: (
        keyOrIndex: symbol | string | number,
        hostWrapper: InstanceWrapper,
        instanceWrapper: InstanceWrapper,
      ) => void;
    }

    let exposedInjector: IInjector;
    let hostWrapper: InstanceWrapper;
    let instanceWrapper: InstanceWrapper;

    beforeEach(() => {
      exposedInjector = injector as unknown as IInjector;
      hostWrapper = new InstanceWrapper();
      instanceWrapper = new InstanceWrapper();
    });

    it('should add dependency metadata to PropertiesMetadata when key is symbol', async () => {
      const addPropertiesMetadataSpy = vi.spyOn(
        hostWrapper,
        'addPropertiesMetadata',
      );

      const key = Symbol.for('symbol');
      exposedInjector.addDependencyMetadata(key, hostWrapper, instanceWrapper);

      expect(addPropertiesMetadataSpy).toHaveBeenCalled();
    });

    it('should add dependency metadata to PropertiesMetadata when key is string', async () => {
      const addPropertiesMetadataSpy = vi.spyOn(
        hostWrapper,
        'addPropertiesMetadata',
      );

      const key = 'string';
      exposedInjector.addDependencyMetadata(key, hostWrapper, instanceWrapper);

      expect(addPropertiesMetadataSpy).toHaveBeenCalled();
    });

    it('should add dependency metadata to CtorMetadata when key is number', async () => {
      const addCtorMetadataSpy = vi.spyOn(hostWrapper, 'addCtorMetadata');

      const key = 0;
      exposedInjector.addDependencyMetadata(key, hostWrapper, instanceWrapper);

      expect(addCtorMetadataSpy).toHaveBeenCalled();
    });
  });
});
