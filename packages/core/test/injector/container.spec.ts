import { expect } from 'chai';
import * as sinon from 'sinon';
import { Module } from '../../../common/decorators/modules/module.decorator';
import { Global } from '../../../common/index';
import { UnknownModuleException } from '../../errors/exceptions/unknown-module.exception';
import { NestContainer } from '../../injector/container';

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

  it('should "addComponent" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addComponent(null, 'TestModule')).throw(
      UnknownModuleException,
    );
  });

  it('should "addController" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addController(null, 'TestModule')).throw(
      UnknownModuleException,
    );
  });

  it('should "addExportedComponent" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addExportedComponent(null, 'TestModule')).throw(
      UnknownModuleException,
    );
  });

  it('should "addInjectable" throw "UnknownModuleException" when module is not stored in collection', () => {
    expect(() => container.addInjectable(null, 'TestModule')).throw(
      UnknownModuleException,
    );
  });

  describe('clear', () => {
    it('should call `clear` on modules collection', () => {
      const clearSpy = sinon.spy((container as any).modules, 'clear');
      container.clear();
      expect(clearSpy.called).to.be.true;
    });
  });

  describe('addModule', () => {
    it('should not add module if already exists in collection', async () => {
      const modules = new Map();
      const setSpy = sinon.spy(modules, 'set');
      (container as any).modules = modules;

      await container.addModule(TestModule as any, []);
      await container.addModule(TestModule as any, []);

      expect(setSpy.calledOnce).to.be.true;
    });

    it('should throws an exception when metatype is not defined', () => {
      expect(container.addModule(undefined, [])).to.eventually.throws();
    });

    it('should add global module when module is global', async () => {
      const addGlobalModuleSpy = sinon.spy(container, 'addGlobalModule');
      await container.addModule(GlobalTestModule as any, []);
      expect(addGlobalModuleSpy.calledOnce).to.be.true;
    });
  });
  describe('isGlobalModule', () => {
    describe('when module is not global scoped', () => {
      it('should return false', () => {
        expect(container.isGlobalModule(TestModule as any)).to.be.false;
      });
    });
    describe('when module is not global scoped', () => {
      it('should return true', () => {
        expect(container.isGlobalModule(GlobalTestModule as any)).to.be.true;
      });
    });
  });

  describe('bindGlobalsToRelatedModules', () => {
    it('should call "bindGlobalModuleToModule" for every global module', () => {
      const global1 = { test: 1 };
      const global2 = { test: 2 };

      container.addGlobalModule(global1 as any);
      container.addGlobalModule(global2 as any);

      const bindGlobalModuleToModuleSpy = sinon.spy(
        container,
        'bindGlobalModuleToModule',
      );
      container.bindGlobalsToRelatedModules({
        addRelatedModule: sinon.spy(),
      } as any);
      expect(bindGlobalModuleToModuleSpy.calledTwice).to.be.true;
    });
  });

  describe('bindGlobalModuleToModule', () => {
    describe('when "module" is not "globalModule"', () => {
      it('should call "addRelatedModule"', () => {
        const module = { addRelatedModule: sinon.spy() };
        container.bindGlobalModuleToModule(module as any, null);
        expect(module.addRelatedModule.calledOnce).to.be.true;
      });
    });
    describe('when "module" is "globalModule"', () => {
      it('should not call "addRelatedModule"', () => {
        const module = { addRelatedModule: sinon.spy() };
        container.bindGlobalModuleToModule(module as any, module as any);
        expect(module.addRelatedModule.calledOnce).to.be.false;
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
        expect(addSpy.calledWith(token, dynamicMetadata)).to.be.true;
      });
    });
    describe('when dynamic metadata does not exists', () => {
      it('should not add to the dynamic metadata collection', () => {
        const addSpy = sinon.spy(collection, 'set');
        container.addDynamicMetadata(token, null, []);
        expect(addSpy.called).to.be.false;
      });
    });
  });

  class Test {}
  describe('addDynamicModules', () => {
    describe('when array is empty/undefined', () => {
      it('should not call "addModule"', () => {
        const addModuleSpy = sinon.spy(container, 'addModule');
        container.addDynamicModules(undefined, []);
        expect(addModuleSpy.called).to.be.false;
      });
    });
    describe('when array is not empty/undefined', () => {
      it('should call "addModule"', () => {
        const addModuleSpy = sinon.spy(container, 'addModule');
        container.addDynamicModules([Test] as any, []);
        expect(addModuleSpy.called).to.be.true;
      });
    });
  });
});
