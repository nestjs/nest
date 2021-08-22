import * as sinon from 'sinon';
import { Module } from '../../../common/decorators/modules/module.decorator';
import { Global } from '../../../common/index';
import { CircularDependencyException } from '../../errors/exceptions/circular-dependency.exception';
import { UnknownModuleException } from '../../errors/exceptions/unknown-module.exception';
import { NestContainer } from '../../injector/container';
import { NoopHttpAdapter } from '../utils/noop-adapter.spec';

describe('NestContainer', () => {
  let container: NestContainer;

  @Module({})
  class TestModule {}

  @Global()
  @Module({})
  class GlobalTestModule {}

  beforeEach(() => {
    container = new NestContainer();
  });

  it('should "addProvider" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addProvider({} as any, 'TestModule')).toThrow(
      UnknownModuleException,
    );
  });

  it('should "addProvider" throw "CircularDependencyException" when provider is nil', () => {
    expect(() => container.addProvider(null, 'TestModule')).toThrow(
      CircularDependencyException,
    );
  });

  it('should "addController" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addController(null, 'TestModule')).toThrow(
      UnknownModuleException,
    );
  });

  it('should "addExportedProvider" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addExportedProvider(null, 'TestModule')).toThrow(
      UnknownModuleException,
    );
  });

  it('should "addInjectable" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addInjectable(null, 'TestModule', null)).toThrow(
      UnknownModuleException,
    );
  });

  describe('clear', () => {
    it('should call `clear` on modules collection', () => {
      const clearSpy = sinon.spy((container as any).modules, 'clear');
      container.clear();
      expect(clearSpy.called).toBeTruthy();
    });
  });

  describe('addModule', () => {
    it('should not add module if already exists in collection', async () => {
      const modules = new Map();
      const setSpy = sinon.spy(modules, 'set');
      (container as any).modules = modules;

      await container.addModule(TestModule as any, []);
      await container.addModule(TestModule as any, []);

      expect(setSpy.calledOnce).toBeTruthy();
    });

    it('should throws an exception when metatype is not defined', () => {
      expect(container.addModule(undefined, [])).rejects.toThrow();
    });

    it('should add global module when module is global', async () => {
      const addGlobalModuleSpy = sinon.spy(container, 'addGlobalModule');
      await container.addModule(GlobalTestModule as any, []);
      expect(addGlobalModuleSpy.calledOnce).toBeTruthy();
    });
  });
  describe('isGlobalModule', () => {
    describe('when module is not globally scoped', () => {
      it('should return false', () => {
        expect(container.isGlobalModule(TestModule)).toBeFalsy();
      });
    });
    describe('when module is globally scoped', () => {
      it('should return true', () => {
        expect(container.isGlobalModule(GlobalTestModule)).toBeTruthy();
      });
    });
    describe('when dynamic module is globally scoped', () => {
      it('should return true', () => {
        expect(container.isGlobalModule(TestModule, { global: true })).toBeTruthy();
      });
    });
  });

  describe('bindGlobalsToImports', () => {
    it('should call "bindGlobalModuleToModule" for every global module', () => {
      const global1 = { test: 1 };
      const global2 = { test: 2 };

      container.addGlobalModule(global1 as any);
      container.addGlobalModule(global2 as any);

      const bindGlobalModuleToModuleSpy = sinon.spy(
        container,
        'bindGlobalModuleToModule',
      );
      container.bindGlobalsToImports({
        addRelatedModule: sinon.spy(),
      } as any);
      expect(bindGlobalModuleToModuleSpy.calledTwice).toBeTruthy();
    });
  });

  describe('bindGlobalModuleToModule', () => {
    describe('when "module" is not "globalModule"', () => {
      it('should call "addRelatedModule"', () => {
        const module = { addRelatedModule: sinon.spy() };
        container.bindGlobalModuleToModule(module as any, null);
        expect(module.addRelatedModule.calledOnce).toBeTruthy();
      });
    });
    describe('when "module" is "globalModule"', () => {
      it('should not call "addRelatedModule"', () => {
        const module = { addRelatedModule: sinon.spy() };
        container.bindGlobalModuleToModule(module as any, module as any);
        expect(module.addRelatedModule.calledOnce).toBeFalsy();
      });
    });
  });

  describe('addDynamicMetadata', () => {
    let token: string;
    let collection: Map<string, any>;

    beforeEach(() => {
      token = 'token';
      collection = new Map();
      (container as any).dynamicModulesMetadata = collection;
    });
    describe('when dynamic metadata exists', () => {
      it('should add to the dynamic metadata collection', () => {
        const addSpy = sinon.spy(collection, 'set');
        const dynamicMetadata = { module: null };

        container.addDynamicMetadata(token, dynamicMetadata, []);
        expect(addSpy.calledWith(token, dynamicMetadata)).toBeTruthy();
      });
    });
    describe('when dynamic metadata does not exists', () => {
      it('should not add to the dynamic metadata collection', () => {
        const addSpy = sinon.spy(collection, 'set');
        container.addDynamicMetadata(token, null, []);
        expect(addSpy.called).toBeFalsy();
      });
    });
  });

  class Test {}
  describe('addDynamicModules', () => {
    describe('when array is empty/undefined', () => {
      it('should not call "addModule"', () => {
        const addModuleSpy = sinon.spy(container, 'addModule');
        container.addDynamicModules(undefined, []);
        expect(addModuleSpy.called).toBeFalsy();
      });
    });
    describe('when array is not empty/undefined', () => {
      it('should call "addModule"', () => {
        const addModuleSpy = sinon.spy(container, 'addModule');
        container.addDynamicModules([Test] as any, []);
        expect(addModuleSpy.called).toBeTruthy();
      });
    });
  });

  describe('get applicationConfig', () => {
    it('should return ApplicationConfig instance', () => {
      expect(container.applicationConfig).toEqual(
        (container as any)._applicationConfig,
      );
    });
  });

  describe('setHttpAdapter', () => {
    it('should set http adapter', () => {
      const httpAdapter = new NoopHttpAdapter({});
      container.setHttpAdapter(httpAdapter);

      const internalStorage = (container as any).internalProvidersStorage;
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
      expect((container as any).internalCoreModule).toEqual(ref);
    });
  });
});
