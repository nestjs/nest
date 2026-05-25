import { Module } from '../../../common/decorators/modules/module.decorator.js';
import { Global } from '../../../common/index.js';
import { CircularDependencyException } from '../../errors/exceptions/circular-dependency.exception.js';
import { UnknownModuleException } from '../../errors/exceptions/unknown-module.exception.js';
import { NestContainer } from '../../injector/container.js';
import { NoopHttpAdapter } from '../utils/noop-adapter.js';

describe('NestContainer', () => {
  let container: NestContainer;
  let untypedContainer: any;

  @Module({})
  class TestModule {}

  @Global()
  @Module({})
  class GlobalTestModule {}

  beforeEach(() => {
    container = new NestContainer();
    untypedContainer = container as any;
  });

  it('should "addProvider" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addProvider({} as any, 'TestModule')).toThrow(
      UnknownModuleException,
    );
  });

  it('should "addProvider" throw "CircularDependencyException" when provider is nil', () => {
    expect(() => container.addProvider(null!, 'TestModule')).toThrow(
      CircularDependencyException,
    );
  });

  it('should "addController" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addController(null!, 'TestModule')).toThrow(
      UnknownModuleException,
    );
  });

  it('should "addExportedProviderOrModule" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() =>
      container.addExportedProviderOrModule(null!, 'TestModule'),
    ).toThrow(UnknownModuleException);
  });

  it('should "addInjectable" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addInjectable(null!, 'TestModule', null!)).toThrow(
      UnknownModuleException,
    );
  });

  describe('clear', () => {
    it('should call `clear` on modules collection', () => {
      const clearSpy = vi.spyOn(untypedContainer.modules, 'clear');
      container.clear();
      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('addModule', () => {
    it('should not add module if already exists in collection', async () => {
      const modules = new Map();
      const setSpy = vi.spyOn(modules, 'set');
      untypedContainer.modules = modules;

      await container.addModule(TestModule as any, []);
      await container.addModule(TestModule as any, []);

      expect(setSpy).toHaveBeenCalledOnce();
    });

    it('should throw an exception when metatype is not defined', async () => {
      await expect(container.addModule(undefined!, [])).rejects.toThrow();
    });

    it('should add global module when module is global', async () => {
      const addGlobalModuleSpy = vi.spyOn(container, 'addGlobalModule');
      await container.addModule(GlobalTestModule as any, []);
      expect(addGlobalModuleSpy).toHaveBeenCalledOnce();
    });
  });

  describe('replaceModule', () => {
    it('should replace module if already exists in collection', async () => {
      @Module({})
      class ReplaceTestModule {}

      const modules = new Map();
      const setSpy = vi.spyOn(modules, 'set');
      untypedContainer.modules = modules;

      await container.addModule(TestModule as any, []);
      await container.replaceModule(
        TestModule as any,
        ReplaceTestModule as any,
        [],
      );

      expect(setSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw an exception when metatype is not defined', async () => {
      await expect(container.addModule(undefined!, [])).rejects.toThrow();
    });

    it('should add global module when module is global', async () => {
      const addGlobalModuleSpy = vi.spyOn(container, 'addGlobalModule');
      await container.addModule(GlobalTestModule as any, []);
      expect(addGlobalModuleSpy).toHaveBeenCalledOnce();
    });
  });

  describe('isGlobalModule', () => {
    describe('when module is not globally scoped', () => {
      it('should return false', () => {
        expect(container.isGlobalModule(TestModule)).toBe(false);
      });
    });
    describe('when module is globally scoped', () => {
      it('should return true', () => {
        expect(container.isGlobalModule(GlobalTestModule)).toBe(true);
      });
    });
    describe('when dynamic module is globally scoped', () => {
      it('should return true', () => {
        expect(container.isGlobalModule(TestModule, { global: true })).toBe(
          true,
        );
      });
    });
  });

  describe('bindGlobalsToImports', () => {
    it('should call "bindGlobalModuleToModule" for every global module', () => {
      const global1 = { test: 1 };
      const global2 = { test: 2 };

      container.addGlobalModule(global1 as any);
      container.addGlobalModule(global2 as any);

      const bindGlobalModuleToModuleSpy = vi.spyOn(
        container,
        'bindGlobalModuleToModule',
      );
      container.bindGlobalsToImports({
        addImport: vi.fn(),
      } as any);
      expect(bindGlobalModuleToModuleSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('bindGlobalModuleToModule', () => {
    describe('when "module" is not "globalModule"', () => {
      it('should call "addImport"', () => {
        const module = { addImport: vi.fn() };
        container.bindGlobalModuleToModule(module as any, null!);
        expect(module.addImport).toHaveBeenCalledOnce();
      });
    });
    describe('when "module" is "globalModule"', () => {
      it('should not call "addImport"', () => {
        const module = { addImport: vi.fn() };
        container.bindGlobalModuleToModule(module as any, module as any);
        expect(module.addImport).not.toHaveBeenCalled();
      });
    });
  });

  describe('addDynamicMetadata', () => {
    let token: string;
    let collection: Map<string, any>;

    beforeEach(() => {
      token = 'token';
      collection = new Map();
      untypedContainer.dynamicModulesMetadata = collection;
    });
    describe('when dynamic metadata exists', () => {
      it('should add to the dynamic metadata collection', async () => {
        const addSpy = vi.spyOn(collection, 'set');
        const dynamicMetadata = { module: null! };

        await container.addDynamicMetadata(token, dynamicMetadata, []);
        expect(addSpy).toHaveBeenCalledWith(token, dynamicMetadata);
      });
    });
    describe('when dynamic metadata does not exists', () => {
      it('should not add to the dynamic metadata collection', async () => {
        const addSpy = vi.spyOn(collection, 'set');
        await container.addDynamicMetadata(token, null!, []);
        expect(addSpy).not.toHaveBeenCalled();
      });
    });
  });

  class Test {}
  describe('addDynamicModules', () => {
    describe('when array is empty/undefined', () => {
      it('should not call "addModule"', async () => {
        const addModuleSpy = vi.spyOn(container, 'addModule');
        await container.addDynamicModules(undefined!, []);
        expect(addModuleSpy).not.toHaveBeenCalled();
      });
    });
    describe('when array is not empty/undefined', () => {
      it('should call "addModule"', async () => {
        const addModuleSpy = vi.spyOn(container, 'addModule');
        await container.addDynamicModules([Test] as any, []);
        expect(addModuleSpy).toHaveBeenCalled();
      });
    });
  });

  describe('get applicationConfig', () => {
    it('should return ApplicationConfig instance', () => {
      expect(container.applicationConfig).toEqual(
        untypedContainer._applicationConfig,
      );
    });
  });

  describe('setHttpAdapter', () => {
    it('should set http adapter', () => {
      const httpAdapter = new NoopHttpAdapter({});
      container.setHttpAdapter(httpAdapter);

      const internalStorage = untypedContainer.internalProvidersStorage;
      expect(internalStorage.httpAdapter).toEqual(httpAdapter);
    });
  });

  describe('getModuleByKey', () => {
    it('should return module by passed key', () => {
      const key = 'test';
      const value = {};
      container.getModules().set(key, value as any);

      expect(container.getModuleByKey(key)).toEqual(value);
    });
  });

  describe('registerCoreModuleRef', () => {
    it('should register core module ref', () => {
      const ref = {} as any;
      container.registerCoreModuleRef(ref);
      expect(untypedContainer.internalCoreModule).toEqual(ref);
    });
  });
});
