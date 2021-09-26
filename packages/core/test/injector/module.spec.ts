import { Controller, Scope } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Injectable } from '../../../common';
import { Module as ModuleDecorator } from '../../../common/decorators/modules/module.decorator';
import { RuntimeException } from '../../errors/exceptions/runtime.exception';
import { UnknownElementException } from '../../errors/exceptions/unknown-element.exception';
import { UnknownExportException } from '../../errors/exceptions/unknown-export.exception';
import { NestContainer } from '../../injector/container';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { Module } from '../../injector/module';

describe('Module', () => {
  let module: Module;
  let container: NestContainer;

  @ModuleDecorator({})
  class TestModule {}

  @Injectable()
  class TestProvider {}

  beforeEach(() => {
    container = new NestContainer();
    module = new Module(TestModule, container);
  });

  it('should add controller', () => {
    const collection = new Map();
    const setSpy = sinon.spy(collection, 'set');
    (module as any)._controllers = collection;

    @Controller({ scope: Scope.REQUEST })
    class Test {}

    module.addController(Test);
    expect(
      setSpy.calledWith(
        Test,
        new InstanceWrapper({
          host: module,
          token: Test,
          name: 'Test',
          scope: Scope.REQUEST,
          metatype: Test,
          instance: null,
          isResolved: false,
        }),
      ),
    ).to.be.true;
  });

  it('should add injectable', () => {
    const collection = new Map();
    const setSpy = sinon.spy(collection, 'set');
    (module as any)._injectables = collection;

    module.addInjectable(TestProvider, TestModule);
    expect(
      setSpy.calledWith(
        TestProvider,
        new InstanceWrapper({
          host: module,
          name: 'TestProvider',
          token: TestProvider,
          scope: undefined,
          metatype: TestProvider,
          instance: null,
          isResolved: false,
        }),
      ),
    ).to.be.true;
  });

  describe('when injectable is custom provided', () => {
    it('should call `addCustomProvider`', () => {
      const addCustomProviderSpy = sinon.spy(module, 'addCustomProvider');

      module.addInjectable({ provide: 'test' } as any);
      expect(addCustomProviderSpy.called).to.be.true;
    });
  });

  it('should add provider', () => {
    const collection = new Map();
    const setSpy = sinon.spy(collection, 'set');
    (module as any)._providers = collection;

    module.addProvider(TestProvider);
    expect(
      setSpy.calledWith(
        TestProvider,
        new InstanceWrapper({
          host: module,
          name: 'TestProvider',
          token: TestProvider,
          scope: undefined,
          metatype: TestProvider,
          instance: null,
          isResolved: false,
        }),
      ),
    ).to.be.true;
  });

  it('should call "addCustomProvider" when "provide" property exists', () => {
    const addCustomProvider = sinon.spy();
    module.addCustomProvider = addCustomProvider;

    const provider = { provide: 'test', useValue: 'test' };

    module.addProvider(provider as any);
    expect((addCustomProvider as sinon.SinonSpy).called).to.be.true;
  });

  it('should call "addCustomClass" when "useClass" property exists', () => {
    const addCustomClass = sinon.spy();
    module.addCustomClass = addCustomClass;

    const provider = { provide: 'test', useClass: () => null };

    module.addCustomProvider(provider as any, new Map());
    expect((addCustomClass as sinon.SinonSpy).called).to.be.true;
  });

  it('should call "addCustomValue" when "useValue" property exists', () => {
    const addCustomValue = sinon.spy();
    module.addCustomValue = addCustomValue;

    const provider = { provide: 'test', useValue: () => null };

    module.addCustomProvider(provider as any, new Map());
    expect((addCustomValue as sinon.SinonSpy).called).to.be.true;
  });

  it('should call "addCustomFactory" when "useFactory" property exists', () => {
    const addCustomFactory = sinon.spy();
    module.addCustomFactory = addCustomFactory;

    const provider = { provide: 'test', useFactory: () => null };

    module.addCustomProvider(provider as any, new Map());
    expect((addCustomFactory as sinon.SinonSpy).called).to.be.true;
  });

  it('should call "addCustomUseExisting" when "useExisting" property exists', () => {
    const addCustomUseExisting = sinon.spy();
    module.addCustomUseExisting = addCustomUseExisting;

    const provider = { provide: 'test', useExisting: () => null };

    module.addCustomUseExisting(provider as any, new Map());
    expect((addCustomUseExisting as sinon.SinonSpy).called).to.be.true;
  });

  describe('addCustomClass', () => {
    const type = { name: 'TypeTest' };
    const provider = { provide: type, useClass: type };
    let setSpy;

    beforeEach(() => {
      const collection = new Map();
      setSpy = sinon.spy(collection, 'set');
      (module as any)._providers = collection;
    });
    it('should store provider', () => {
      module.addCustomClass(provider as any, (module as any)._providers);
      expect(
        setSpy.calledWith(
          provider.provide,
          new InstanceWrapper({
            host: module,
            token: type as any,
            name: provider.provide.name,
            scope: undefined,
            metatype: type as any,
            instance: null,
            isResolved: false,
          }),
        ),
      ).to.be.true;
    });
  });

  describe('addCustomValue', () => {
    let setSpy;
    const value = () => ({});
    const provider = { provide: value, useValue: value };

    beforeEach(() => {
      const collection = new Map();
      setSpy = sinon.spy(collection, 'set');
      (module as any)._providers = collection;
    });

    it('should store provider', () => {
      module.addCustomValue(provider as any, (module as any)._providers);
      expect(
        setSpy.calledWith(
          provider.provide,
          new InstanceWrapper({
            host: module,
            token: provider.provide,
            name: provider.provide.name,
            scope: Scope.DEFAULT,
            metatype: null,
            instance: value,
            isResolved: true,
            async: false,
          }),
        ),
      ).to.be.true;
    });
  });

  describe('addCustomFactory', () => {
    const type = { name: 'TypeTest' };
    const inject = [1, 2, 3];
    const provider = { provide: type, useFactory: type, inject };

    let setSpy;
    beforeEach(() => {
      const collection = new Map();
      setSpy = sinon.spy(collection, 'set');
      (module as any)._providers = collection;
    });
    it('should store provider', () => {
      module.addCustomFactory(provider as any, (module as any)._providers);

      expect(
        setSpy.calledWith(
          provider.provide,
          new InstanceWrapper({
            host: module,
            token: provider.provide as any,
            name: provider.provide.name,
            scope: undefined,
            metatype: type as any,
            instance: null,
            isResolved: false,
            inject: inject as any,
          }),
        ),
      ).to.be.true;
    });
  });

  describe('addCustomUseExisting', () => {
    const type = { name: 'TypeTest' };
    const provider = { provide: type, useExisting: type };

    let setSpy;
    beforeEach(() => {
      const collection = new Map();
      setSpy = sinon.spy(collection, 'set');
      (module as any)._providers = collection;
    });
    it('should store provider', () => {
      module.addCustomUseExisting(provider as any, (module as any)._providers);
      const factoryFn = (module as any)._providers.get(
        provider.provide,
      ).metatype;

      const token = provider.provide as any;
      expect(
        setSpy.calledWith(
          token,
          new InstanceWrapper({
            host: module,
            token,
            name: provider.provide.name,
            metatype: factoryFn,
            instance: null,
            inject: [provider.useExisting as any],
            isResolved: false,
            isAlias: true,
          }),
        ),
      ).to.be.true;
      expect(factoryFn(provider.useExisting)).to.be.eql(type);
    });
  });

  describe('when get instance', () => {
    describe('when metatype does not exists in providers collection', () => {
      beforeEach(() => {
        sinon.stub((module as any)._providers, 'has').returns(false);
      });
      it('should throws RuntimeException', () => {
        expect(() => module.instance).to.throws(RuntimeException);
      });
    });
    describe('when metatype exists in providers collection', () => {
      it('should return null', () => {
        expect(module.instance).to.be.eql(null);
      });
    });
  });

  describe('when exported provider is custom provided', () => {
    beforeEach(() => {
      sinon.stub(module, 'validateExportedProvider').callsFake(o => o);
    });
    it('should call `addCustomExportedProvider`', () => {
      const addCustomExportedProviderSpy = sinon.spy(
        module,
        'addCustomExportedProvider',
      );

      module.addExportedProvider({ provide: 'test' } as any);
      expect(addCustomExportedProviderSpy.called).to.be.true;
    });
    it('should support symbols', () => {
      const addCustomExportedProviderSpy = sinon.spy(
        module,
        'addCustomExportedProvider',
      );
      const symb = Symbol('test');
      module.addExportedProvider({ provide: symb } as any);
      expect(addCustomExportedProviderSpy.called).to.be.true;
      expect((module as any)._exports.has(symb)).to.be.true;
    });
  });

  describe('replace', () => {
    describe('when provider', () => {
      it('should call `mergeWith`', () => {
        const wrapper = {
          mergeWith: sinon.spy(),
        };
        sinon.stub(module, 'hasProvider').callsFake(() => true);
        sinon.stub(module.providers, 'get').callsFake(() => wrapper as any);

        module.replace(null, { isProvider: true });
        expect(wrapper.mergeWith.called).to.be.true;
      });
    });
    describe('when guard', () => {
      it('should call `mergeWith`', () => {
        const wrapper = {
          mergeWith: sinon.spy(),
          isProvider: true,
        };
        sinon.stub(module, 'hasInjectable').callsFake(() => true);
        sinon.stub(module.injectables, 'get').callsFake(() => wrapper as any);

        module.replace(null, {});
        expect(wrapper.mergeWith.called).to.be.true;
      });
    });
  });

  describe('imports', () => {
    it('should return relatedModules', () => {
      const test = ['test'];
      (module as any)._imports = test;

      expect(module.imports).to.be.eql(test);
      expect(module.relatedModules).to.be.eql(test);
    });
  });

  describe('injectables', () => {
    it('should return injectables', () => {
      const test = ['test'];
      (module as any)._injectables = test;
      expect(module.injectables).to.be.eql(test);
    });
  });

  describe('controllers', () => {
    it('should return controllers', () => {
      const test = ['test'];
      (module as any)._controllers = test;

      expect(module.controllers).to.be.eql(test);
      expect(module.routes).to.be.eql(test);
    });
  });

  describe('exports', () => {
    it('should return exports', () => {
      const test = ['test'];
      (module as any)._exports = test;

      expect(module.exports).to.be.eql(test);
    });
  });

  describe('providers', () => {
    it('should return providers', () => {
      const test = ['test'];
      (module as any)._providers = test;

      expect(module.providers).to.be.eql(test);
      expect(module.components).to.be.eql(test);
    });
  });

  describe('createModuleReferenceType', () => {
    let moduleRef;

    class SimpleClass {}

    beforeEach(() => {
      const Class = module.createModuleReferenceType();
      moduleRef = new Class();
    });

    it('should return metatype with "get" method', () => {
      expect(!!moduleRef.get).to.be.true;
    });
    describe('get', () => {
      it('should throw exception if not exists', () => {
        expect(() => moduleRef.get('fail')).to.throws(UnknownElementException);
      });
    });
  });
  describe('validateExportedProvider', () => {
    const token = 'token';

    describe('when unit exists in provider collection', () => {
      it('should behave as identity', () => {
        (module as any)._providers = new Map([[token, true]]);
        expect(module.validateExportedProvider(token)).to.be.eql(token);
      });
    });
    describe('when unit exists in related modules collection', () => {
      it('should behave as identity', () => {
        class Random {}
        (module as any)._imports = new Set([
          new Module(Random, new NestContainer()),
        ]);
        expect(module.validateExportedProvider(Random)).to.be.eql(Random);
      });
    });
    describe('when unit does not exist in both provider and related modules collections', () => {
      it('should throw UnknownExportException', () => {
        expect(() => module.validateExportedProvider(token)).to.throws(
          UnknownExportException,
        );
      });
    });
  });

  describe('hasProvider', () => {
    describe('when module has provider', () => {
      it('should return true', () => {
        const token = 'test';
        module.providers.set(token, new InstanceWrapper());
        expect(module.hasProvider(token)).to.be.true;
      });
    });
    describe('otherwise', () => {
      it('should return false', () => {
        expect(module.hasProvider('_')).to.be.false;
      });
    });
  });

  describe('hasInjectable', () => {
    describe('when module has injectable', () => {
      it('should return true', () => {
        const token = 'test';
        module.injectables.set(token, new InstanceWrapper());
        expect(module.hasInjectable(token)).to.be.true;
      });
    });
    describe('otherwise', () => {
      it('should return false', () => {
        expect(module.hasInjectable('_')).to.be.false;
      });
    });
  });

  describe('getter "id"', () => {
    it('should return module id', () => {
      expect(module.id).to.be.equal(module['_id']);
    });
  });

  describe('getProviderByKey', () => {
    describe('when does not exist', () => {
      it('should return undefined', () => {
        expect(module.getProviderByKey('test')).to.be.undefined;
      });
    });
    describe('otherwise', () => {
      it('should return instance wrapper', () => {
        module.addProvider(TestProvider);
        expect(module.getProviderByKey(TestProvider)).to.not.be.undefined;
      });
    });
  });
});
