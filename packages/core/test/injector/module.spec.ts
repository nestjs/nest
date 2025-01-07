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
  let moduleRef: Module;
  let untypedModuleRef: any;
  let container: NestContainer;

  @ModuleDecorator({})
  class TestModule {}

  @Injectable()
  class TestProvider {}

  beforeEach(() => {
    container = new NestContainer();
    moduleRef = new Module(TestModule, container);
    untypedModuleRef = moduleRef as any;
  });

  it('should add controller', () => {
    const collection = new Map();
    const setSpy = sinon.spy(collection, 'set');
    untypedModuleRef._controllers = collection;

    @Controller({ scope: Scope.REQUEST, durable: true })
    class Test {}

    moduleRef.addController(Test);
    expect(
      setSpy.calledWith(
        Test,
        new InstanceWrapper({
          host: moduleRef,
          token: Test,
          name: 'Test',
          scope: Scope.REQUEST,
          metatype: Test,
          durable: true,
          instance: null,
          isResolved: false,
        }),
      ),
    ).to.be.true;
  });

  it('should add injectable', () => {
    const collection = new Map();
    const setSpy = sinon.spy(collection, 'set');
    untypedModuleRef._injectables = collection;

    moduleRef.addInjectable(TestProvider, 'interceptor', TestModule);
    expect(
      setSpy.calledWith(
        TestProvider,
        new InstanceWrapper({
          host: moduleRef,
          name: 'TestProvider',
          token: TestProvider,
          scope: undefined,
          metatype: TestProvider,
          instance: null,
          durable: undefined,
          isResolved: false,
          subtype: 'interceptor',
        }),
      ),
    ).to.be.true;
  });

  describe('when injectable is custom provided', () => {
    it('should call `addCustomProvider`', () => {
      const addCustomProviderSpy = sinon.spy(moduleRef, 'addCustomProvider');

      moduleRef.addInjectable({ provide: 'test' } as any, 'guard');
      expect(addCustomProviderSpy.called).to.be.true;
    });
  });

  it('should add provider', () => {
    const collection = new Map();
    const setSpy = sinon.spy(collection, 'set');
    untypedModuleRef._providers = collection;

    moduleRef.addProvider(TestProvider);
    expect(
      setSpy.calledWith(
        TestProvider,
        new InstanceWrapper({
          host: moduleRef,
          name: 'TestProvider',
          token: TestProvider,
          scope: undefined,
          metatype: TestProvider,
          durable: undefined,
          instance: null,
          isResolved: false,
        }),
      ),
    ).to.be.true;
  });

  it('should call "addCustomProvider" when "provide" property exists', () => {
    const addCustomProvider = sinon.spy();
    moduleRef.addCustomProvider = addCustomProvider;

    const provider = { provide: 'test', useValue: 'test' };

    moduleRef.addProvider(provider as any);
    expect(addCustomProvider.called).to.be.true;
  });

  it('should call "addCustomClass" when "useClass" property exists', () => {
    const addCustomClass = sinon.spy();
    moduleRef.addCustomClass = addCustomClass;

    const provider = { provide: 'test', useClass: () => null };

    moduleRef.addCustomProvider(provider as any, new Map());
    expect(addCustomClass.called).to.be.true;
  });

  it('should call "addCustomValue" when "useValue" property exists', () => {
    const addCustomValue = sinon.spy();
    moduleRef.addCustomValue = addCustomValue;

    const provider = { provide: 'test', useValue: () => null };

    moduleRef.addCustomProvider(provider as any, new Map());
    expect(addCustomValue.called).to.be.true;
  });

  it('should call "addCustomValue" when "useValue" property exists but its value is `undefined`', () => {
    const addCustomValue = sinon.spy();
    moduleRef.addCustomValue = addCustomValue;

    const provider = { provide: 'test', useValue: undefined };

    moduleRef.addCustomProvider(provider as any, new Map());
    expect(addCustomValue.called).to.be.true;
  });

  it('should call "addCustomFactory" when "useFactory" property exists', () => {
    const addCustomFactory = sinon.spy();
    moduleRef.addCustomFactory = addCustomFactory;

    const provider = { provide: 'test', useFactory: () => null };

    moduleRef.addCustomProvider(provider as any, new Map());
    expect(addCustomFactory.called).to.be.true;
  });

  it('should call "addCustomUseExisting" when "useExisting" property exists', () => {
    const addCustomUseExisting = sinon.spy();
    moduleRef.addCustomUseExisting = addCustomUseExisting;

    const provider = { provide: 'test', useExisting: () => null };

    moduleRef.addCustomUseExisting(provider as any, new Map());
    expect(addCustomUseExisting.called).to.be.true;
  });

  describe('addCustomClass', () => {
    const type = { name: 'TypeTest' };
    const provider = { provide: type, useClass: type, durable: true };
    let setSpy: sinon.SinonSpy;

    beforeEach(() => {
      const collection = new Map();
      setSpy = sinon.spy(collection, 'set');
      untypedModuleRef._providers = collection;
    });
    it('should store provider', () => {
      moduleRef.addCustomClass(provider as any, untypedModuleRef._providers);
      expect(
        setSpy.calledWith(
          provider.provide,
          new InstanceWrapper({
            host: moduleRef,
            token: type as any,
            name: provider.provide.name,
            scope: undefined,
            metatype: type as any,
            durable: true,
            instance: null,
            isResolved: false,
            subtype: undefined,
          }),
        ),
      ).to.be.true;
    });
  });

  describe('addCustomValue', () => {
    let setSpy: sinon.SinonSpy;
    const value = () => ({});
    const provider = { provide: value, useValue: value };

    beforeEach(() => {
      const collection = new Map();
      setSpy = sinon.spy(collection, 'set');
      untypedModuleRef._providers = collection;
    });

    it('should store provider', () => {
      moduleRef.addCustomValue(provider as any, untypedModuleRef._providers);
      expect(
        setSpy.calledWith(
          provider.provide,
          new InstanceWrapper({
            host: moduleRef,
            token: provider.provide,
            name: provider.provide.name,
            scope: Scope.DEFAULT,
            metatype: null,
            instance: value,
            isResolved: true,
            async: false,
            subtype: undefined,
          }),
        ),
      ).to.be.true;
    });
  });

  describe('addCustomFactory', () => {
    const type = { name: 'TypeTest' };
    const inject = [1, 2, 3];
    const provider = { provide: type, useFactory: type, inject, durable: true };

    let setSpy: sinon.SinonSpy;
    beforeEach(() => {
      const collection = new Map();
      setSpy = sinon.spy(collection, 'set');
      untypedModuleRef._providers = collection;
    });
    it('should store provider', () => {
      moduleRef.addCustomFactory(provider as any, untypedModuleRef._providers);

      expect(
        setSpy.calledWith(
          provider.provide,
          new InstanceWrapper({
            host: moduleRef,
            token: provider.provide as any,
            name: provider.provide.name,
            scope: undefined,
            metatype: type as any,
            durable: true,
            instance: null,
            isResolved: false,
            inject: inject as any,
            subtype: undefined,
          }),
        ),
      ).to.be.true;
    });
  });

  describe('addCustomUseExisting', () => {
    const type = { name: 'TypeTest' };
    const provider = { provide: type, useExisting: type };

    let setSpy: sinon.SinonSpy;
    beforeEach(() => {
      const collection = new Map();
      setSpy = sinon.spy(collection, 'set');
      untypedModuleRef._providers = collection;
    });
    it('should store provider', () => {
      moduleRef.addCustomUseExisting(
        provider as any,
        untypedModuleRef._providers,
      );
      const factoryFn = untypedModuleRef._providers.get(
        provider.provide,
      ).metatype;

      const token = provider.provide as any;
      expect(
        setSpy.calledWith(
          token,
          new InstanceWrapper({
            host: moduleRef,
            token,
            name: provider.provide.name,
            metatype: factoryFn,
            instance: null,
            inject: [provider.useExisting as any],
            isResolved: false,
            isAlias: true,
            subtype: undefined,
          }),
        ),
      ).to.be.true;
      expect(factoryFn(provider.useExisting)).to.be.eql(type);
    });
  });

  describe('when get instance', () => {
    describe('when metatype does not exists in providers collection', () => {
      beforeEach(() => {
        sinon.stub(untypedModuleRef._providers, 'has').returns(false);
      });
      it('should throw RuntimeException', () => {
        expect(() => moduleRef.instance).to.throws(RuntimeException);
      });
    });
    describe('when metatype exists in providers collection', () => {
      it('should return null', () => {
        expect(moduleRef.instance).to.be.eql(null);
      });
    });
  });

  describe('when exported provider is custom provided', () => {
    beforeEach(() => {
      sinon.stub(moduleRef, 'validateExportedProvider').callsFake(o => o);
    });
    it('should call `addCustomExportedProvider`', () => {
      const addCustomExportedProviderSpy = sinon.spy(
        moduleRef,
        'addCustomExportedProvider',
      );

      moduleRef.addExportedProviderOrModule({ provide: 'test' } as any);
      expect(addCustomExportedProviderSpy.called).to.be.true;
    });
    it('should support symbols', () => {
      const addCustomExportedProviderSpy = sinon.spy(
        moduleRef,
        'addCustomExportedProvider',
      );
      const symb = Symbol('test');
      moduleRef.addExportedProviderOrModule({ provide: symb } as any);
      expect(addCustomExportedProviderSpy.called).to.be.true;
      expect(untypedModuleRef._exports.has(symb)).to.be.true;
    });
  });

  describe('replace', () => {
    describe('when provider', () => {
      it('should call `mergeWith`', () => {
        const wrapper = {
          mergeWith: sinon.spy(),
        };
        sinon.stub(moduleRef, 'hasProvider').callsFake(() => true);
        sinon.stub(moduleRef.providers, 'get').callsFake(() => wrapper as any);

        moduleRef.replace(null!, { isProvider: true });
        expect(wrapper.mergeWith.called).to.be.true;
      });
    });
    describe('when guard', () => {
      it('should call `mergeWith`', () => {
        const wrapper = {
          mergeWith: sinon.spy(),
          isProvider: true,
        };
        sinon.stub(moduleRef, 'hasInjectable').callsFake(() => true);
        sinon
          .stub(moduleRef.injectables, 'get')
          .callsFake(() => wrapper as any);

        moduleRef.replace(null!, {});
        expect(wrapper.mergeWith.called).to.be.true;
      });
    });
  });

  describe('imports', () => {
    it('should return relatedModules', () => {
      const test = ['test'];
      untypedModuleRef._imports = test;

      expect(moduleRef.imports).to.be.eql(test);
    });
  });

  describe('injectables', () => {
    it('should return injectables', () => {
      const test = ['test'];
      untypedModuleRef._injectables = test;
      expect(moduleRef.injectables).to.be.eql(test);
    });
  });

  describe('controllers', () => {
    it('should return controllers', () => {
      const test = ['test'];
      untypedModuleRef._controllers = test;

      expect(moduleRef.controllers).to.be.eql(test);
    });
  });

  describe('exports', () => {
    it('should return exports', () => {
      const test = ['test'];
      untypedModuleRef._exports = test;

      expect(moduleRef.exports).to.be.eql(test);
    });
  });

  describe('providers', () => {
    it('should return providers', () => {
      const test = ['test'];
      untypedModuleRef._providers = test;

      expect(moduleRef.providers).to.be.eql(test);
    });
  });

  describe('createModuleReferenceType', () => {
    let customModuleRef: any;

    beforeEach(() => {
      const Class = moduleRef.createModuleReferenceType();
      customModuleRef = new Class();
    });

    it('should return metatype with "get" method', () => {
      expect(!!customModuleRef.get).to.be.true;
    });
    describe('get', () => {
      it('should throw exception if not exists', () => {
        expect(() => customModuleRef.get('fail')).to.throws(
          UnknownElementException,
        );
      });
    });
  });
  describe('validateExportedProvider', () => {
    const token = 'token';

    describe('when unit exists in provider collection', () => {
      it('should behave as identity', () => {
        untypedModuleRef._providers = new Map([[token, true]]);
        expect(moduleRef.validateExportedProvider(token)).to.be.eql(token);
      });
    });
    describe('when unit exists in related modules collection', () => {
      it('should behave as identity', () => {
        class Random {}
        untypedModuleRef._imports = new Set([
          new Module(Random, new NestContainer()),
        ]);
        expect(moduleRef.validateExportedProvider(Random)).to.be.eql(Random);
      });
    });
    describe('when unit does not exist in both provider and related modules collections', () => {
      it('should throw UnknownExportException', () => {
        expect(() => moduleRef.validateExportedProvider(token)).to.throws(
          UnknownExportException,
        );
      });
    });
  });

  describe('hasProvider', () => {
    describe('when module has provider', () => {
      it('should return true', () => {
        const token = 'test';
        moduleRef.providers.set(token, new InstanceWrapper());
        expect(moduleRef.hasProvider(token)).to.be.true;
      });
    });
    describe('otherwise', () => {
      it('should return false', () => {
        expect(moduleRef.hasProvider('_')).to.be.false;
      });
    });
  });

  describe('hasInjectable', () => {
    describe('when module has injectable', () => {
      it('should return true', () => {
        const token = 'test';
        moduleRef.injectables.set(token, new InstanceWrapper());
        expect(moduleRef.hasInjectable(token)).to.be.true;
      });
    });
    describe('otherwise', () => {
      it('should return false', () => {
        expect(moduleRef.hasInjectable('_')).to.be.false;
      });
    });
  });

  describe('getter "id"', () => {
    it('should return module id', () => {
      expect(moduleRef.id).to.be.equal(moduleRef['_id']);
    });
  });

  describe('getProviderByKey', () => {
    describe('when does not exist', () => {
      it('should return undefined', () => {
        expect(moduleRef.getProviderByKey('test')).to.be.undefined;
      });
    });
    describe('otherwise', () => {
      it('should return instance wrapper', () => {
        moduleRef.addProvider(TestProvider);
        expect(moduleRef.getProviderByKey(TestProvider)).to.not.be.undefined;
      });
    });
  });
});
