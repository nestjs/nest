import { Controller, Scope } from '@nestjs/common';
import { Module as ModuleDecorator } from '../../../common/decorators/modules/module.decorator.js';
import { Injectable } from '../../../common/index.js';
import { RuntimeException } from '../../errors/exceptions/runtime.exception.js';
import { UnknownElementException } from '../../errors/exceptions/unknown-element.exception.js';
import { UnknownExportException } from '../../errors/exceptions/unknown-export.exception.js';
import { STATIC_CONTEXT } from '../../injector/constants.js';
import { NestContainer } from '../../injector/container.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { Module } from '../../injector/module.js';

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
    const setSpy = vi.spyOn(collection, 'set');
    untypedModuleRef._controllers = collection;

    @Controller({ scope: Scope.REQUEST, durable: true })
    class Test {}

    moduleRef.addController(Test);
    expect(setSpy).toHaveBeenCalledOnce();
    const [key, wrapper] = setSpy.mock.calls[0];
    expect(key).toBe(Test);
    expect(wrapper).toBeInstanceOf(InstanceWrapper);
    expect(wrapper.token).toBe(Test);
    expect(wrapper.name).toBe('Test');
    expect(wrapper.scope).toBe(Scope.REQUEST);
    expect(wrapper.metatype).toBe(Test);
    expect(wrapper.durable).toBe(true);
    expect(wrapper.instance).toBeNull();
    expect(
      wrapper.getInstanceByContextId(STATIC_CONTEXT).isResolved,
    ).toBeFalsy();
  });

  it('should add injectable', () => {
    const collection = new Map();
    const setSpy = vi.spyOn(collection, 'set');
    untypedModuleRef._injectables = collection;

    moduleRef.addInjectable(TestProvider, 'interceptor', TestModule);
    expect(setSpy).toHaveBeenCalledOnce();
    const [key, wrapper] = setSpy.mock.calls[0];
    expect(key).toBe(TestProvider);
    expect(wrapper).toBeInstanceOf(InstanceWrapper);
    expect(wrapper.name).toBe('TestProvider');
    expect(wrapper.token).toBe(TestProvider);
    expect(wrapper.metatype).toBe(TestProvider);
    expect(wrapper.instance).toBeNull();
    expect(
      wrapper.getInstanceByContextId(STATIC_CONTEXT).isResolved,
    ).toBeFalsy();
    expect(wrapper.subtype).toBe('interceptor');
  });

  describe('when injectable is custom provided', () => {
    it('should call `addCustomProvider`', () => {
      const addCustomProviderSpy = vi.spyOn(moduleRef, 'addCustomProvider');

      moduleRef.addInjectable({ provide: 'test' } as any, 'guard');
      expect(addCustomProviderSpy).toHaveBeenCalled();
    });
  });

  it('should add provider', () => {
    const collection = new Map();
    const setSpy = vi.spyOn(collection, 'set');
    untypedModuleRef._providers = collection;

    moduleRef.addProvider(TestProvider);
    expect(setSpy).toHaveBeenCalledOnce();
    const [key, wrapper] = setSpy.mock.calls[0];
    expect(key).toBe(TestProvider);
    expect(wrapper).toBeInstanceOf(InstanceWrapper);
    expect(wrapper.name).toBe('TestProvider');
    expect(wrapper.token).toBe(TestProvider);
    expect(wrapper.metatype).toBe(TestProvider);
    expect(wrapper.instance).toBeNull();
    expect(
      wrapper.getInstanceByContextId(STATIC_CONTEXT).isResolved,
    ).toBeFalsy();
  });

  it('should call "addCustomProvider" when "provide" property exists', () => {
    const addCustomProvider = vi.fn();
    moduleRef.addCustomProvider = addCustomProvider;

    const provider = { provide: 'test', useValue: 'test' };

    moduleRef.addProvider(provider as any);
    expect(addCustomProvider).toHaveBeenCalled();
  });

  it('should call "addCustomClass" when "useClass" property exists', () => {
    const addCustomClass = vi.fn();
    moduleRef.addCustomClass = addCustomClass;

    const provider = { provide: 'test', useClass: () => null };

    moduleRef.addCustomProvider(provider as any, new Map());
    expect(addCustomClass).toHaveBeenCalled();
  });

  it('should call "addCustomValue" when "useValue" property exists', () => {
    const addCustomValue = vi.fn();
    moduleRef.addCustomValue = addCustomValue;

    const provider = { provide: 'test', useValue: () => null };

    moduleRef.addCustomProvider(provider as any, new Map());
    expect(addCustomValue).toHaveBeenCalled();
  });

  it('should call "addCustomValue" when "useValue" property exists but its value is `undefined`', () => {
    const addCustomValue = vi.fn();
    moduleRef.addCustomValue = addCustomValue;

    const provider = { provide: 'test', useValue: undefined };

    moduleRef.addCustomProvider(provider as any, new Map());
    expect(addCustomValue).toHaveBeenCalled();
  });

  it('should call "addCustomFactory" when "useFactory" property exists', () => {
    const addCustomFactory = vi.fn();
    moduleRef.addCustomFactory = addCustomFactory;

    const provider = { provide: 'test', useFactory: () => null };

    moduleRef.addCustomProvider(provider as any, new Map());
    expect(addCustomFactory).toHaveBeenCalled();
  });

  it('should call "addCustomUseExisting" when "useExisting" property exists', () => {
    const addCustomUseExisting = vi.fn();
    moduleRef.addCustomUseExisting = addCustomUseExisting;

    const provider = { provide: 'test', useExisting: () => null };

    moduleRef.addCustomUseExisting(provider as any, new Map());
    expect(addCustomUseExisting).toHaveBeenCalled();
  });

  describe('addCustomClass', () => {
    const type = { name: 'TypeTest' };
    const provider = { provide: type, useClass: type, durable: true };
    let setSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      const collection = new Map();
      setSpy = vi.spyOn(collection, 'set');
      untypedModuleRef._providers = collection;
    });
    it('should store provider', () => {
      moduleRef.addCustomClass(provider as any, untypedModuleRef._providers);
      expect(setSpy).toHaveBeenCalledOnce();
      const [key, wrapper] = setSpy.mock.calls[0];
      expect(key).toBe(provider.provide);
      expect(wrapper).toBeInstanceOf(InstanceWrapper);
      expect(wrapper.token).toBe(type);
      expect(wrapper.name).toBe(provider.provide.name);
      expect(wrapper.metatype).toBe(type);
      expect(wrapper.durable).toBe(true);
      expect(wrapper.instance).toBeNull();
      expect(
        wrapper.getInstanceByContextId(STATIC_CONTEXT).isResolved,
      ).toBeFalsy();
    });
  });

  describe('addCustomValue', () => {
    let setSpy: ReturnType<typeof vi.fn>;
    const value = () => ({});
    const provider = { provide: value, useValue: value };

    beforeEach(() => {
      const collection = new Map();
      setSpy = vi.spyOn(collection, 'set');
      untypedModuleRef._providers = collection;
    });

    it('should store provider', () => {
      moduleRef.addCustomValue(provider as any, untypedModuleRef._providers);
      expect(setSpy).toHaveBeenCalledOnce();
      const [key, wrapper] = setSpy.mock.calls[0];
      expect(key).toBe(provider.provide);
      expect(wrapper).toBeInstanceOf(InstanceWrapper);
      expect(wrapper.token).toBe(provider.provide);
      expect(wrapper.name).toBe(provider.provide.name);
      expect(wrapper.scope).toBe(Scope.DEFAULT);
      expect(wrapper.metatype).toBeNull();
      expect(wrapper.instance).toBe(value);
      expect(
        wrapper.getInstanceByContextId(STATIC_CONTEXT).isResolved,
      ).toBeTruthy();
    });
  });

  describe('addCustomFactory', () => {
    const type = { name: 'TypeTest' };
    const inject = [1, 2, 3];
    const provider = { provide: type, useFactory: type, inject, durable: true };

    let setSpy: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      const collection = new Map();
      setSpy = vi.spyOn(collection, 'set');
      untypedModuleRef._providers = collection;
    });
    it('should store provider', () => {
      moduleRef.addCustomFactory(provider as any, untypedModuleRef._providers);

      expect(setSpy).toHaveBeenCalledOnce();
      const [key, wrapper] = setSpy.mock.calls[0];
      expect(key).toBe(provider.provide);
      expect(wrapper).toBeInstanceOf(InstanceWrapper);
      expect(wrapper.token).toBe(provider.provide);
      expect(wrapper.name).toBe(provider.provide.name);
      expect(wrapper.metatype).toBe(type);
      expect(wrapper.durable).toBe(true);
      expect(wrapper.instance).toBeNull();
      expect(
        wrapper.getInstanceByContextId(STATIC_CONTEXT).isResolved,
      ).toBeFalsy();
      expect(wrapper.inject).toEqual(inject);
    });
  });

  describe('addCustomUseExisting', () => {
    const type = { name: 'TypeTest' };
    const provider = { provide: type, useExisting: type };

    let setSpy: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      const collection = new Map();
      setSpy = vi.spyOn(collection, 'set');
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
      expect(setSpy).toHaveBeenCalledOnce();
      const [key, wrapper] = setSpy.mock.calls[0];
      expect(key).toBe(token);
      expect(wrapper).toBeInstanceOf(InstanceWrapper);
      expect(wrapper.token).toBe(token);
      expect(wrapper.name).toBe(provider.provide.name);
      expect(wrapper.metatype).toBe(factoryFn);
      expect(wrapper.instance).toBeNull();
      expect(wrapper.inject).toEqual([provider.useExisting]);
      expect(
        wrapper.getInstanceByContextId(STATIC_CONTEXT).isResolved,
      ).toBeFalsy();
      expect(wrapper.isAlias).toBe(true);
      expect(factoryFn(provider.useExisting)).toEqual(type);
    });
  });

  describe('when get instance', () => {
    describe('when metatype does not exists in providers collection', () => {
      beforeEach(() => {
        vi.spyOn(untypedModuleRef._providers, 'has').mockReturnValue(false);
      });
      it('should throw RuntimeException', () => {
        expect(() => moduleRef.instance).toThrow(RuntimeException);
      });
    });
    describe('when metatype exists in providers collection', () => {
      it('should return null', () => {
        expect(moduleRef.instance).toEqual(null);
      });
    });
  });

  describe('when exported provider is custom provided', () => {
    beforeEach(() => {
      vi.spyOn(moduleRef, 'validateExportedProvider').mockImplementation(
        o => o,
      );
    });
    it('should call `addCustomExportedProvider`', () => {
      const addCustomExportedProviderSpy = vi.spyOn(
        moduleRef,
        'addCustomExportedProvider',
      );

      moduleRef.addExportedProviderOrModule({ provide: 'test' } as any);
      expect(addCustomExportedProviderSpy).toHaveBeenCalled();
    });
    it('should support symbols', () => {
      const addCustomExportedProviderSpy = vi.spyOn(
        moduleRef,
        'addCustomExportedProvider',
      );
      const symb = Symbol('test');
      moduleRef.addExportedProviderOrModule({ provide: symb } as any);
      expect(addCustomExportedProviderSpy).toHaveBeenCalled();
      expect(untypedModuleRef._exports.has(symb)).toBe(true);
    });
  });

  describe('replace', () => {
    describe('when provider', () => {
      it('should call `mergeWith`', () => {
        const wrapper = {
          mergeWith: vi.fn(),
        };
        vi.spyOn(moduleRef, 'hasProvider').mockImplementation(() => true);
        vi.spyOn(moduleRef.providers, 'get').mockImplementation(
          () => wrapper as any,
        );

        moduleRef.replace(null!, { isProvider: true });
        expect(wrapper.mergeWith).toHaveBeenCalled();
      });
    });
    describe('when guard', () => {
      it('should call `mergeWith`', () => {
        const wrapper = {
          mergeWith: vi.fn(),
          isProvider: true,
        };
        vi.spyOn(moduleRef, 'hasInjectable').mockImplementation(() => true);
        vi.spyOn(moduleRef.injectables, 'get').mockImplementation(
          () => wrapper as any,
        );

        moduleRef.replace(null!, {});
        expect(wrapper.mergeWith).toHaveBeenCalled();
      });
    });
  });

  describe('imports', () => {
    it('should return relatedModules', () => {
      const test = ['test'];
      untypedModuleRef._imports = test;

      expect(moduleRef.imports).toEqual(test);
    });
  });

  describe('injectables', () => {
    it('should return injectables', () => {
      const test = ['test'];
      untypedModuleRef._injectables = test;
      expect(moduleRef.injectables).toEqual(test);
    });
  });

  describe('controllers', () => {
    it('should return controllers', () => {
      const test = ['test'];
      untypedModuleRef._controllers = test;

      expect(moduleRef.controllers).toEqual(test);
    });
  });

  describe('exports', () => {
    it('should return exports', () => {
      const test = ['test'];
      untypedModuleRef._exports = test;

      expect(moduleRef.exports).toEqual(test);
    });
  });

  describe('providers', () => {
    it('should return providers', () => {
      const test = ['test'];
      untypedModuleRef._providers = test;

      expect(moduleRef.providers).toEqual(test);
    });
  });

  describe('createModuleReferenceType', () => {
    let customModuleRef: any;

    beforeEach(() => {
      const Class = moduleRef.createModuleReferenceType();
      customModuleRef = new Class();
    });

    it('should return metatype with "get" method', () => {
      expect(!!customModuleRef.get).toBe(true);
    });
    describe('get', () => {
      it('should throw exception if not exists', () => {
        expect(() => customModuleRef.get('fail')).toThrow(
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
        expect(moduleRef.validateExportedProvider(token)).toEqual(token);
      });
    });
    describe('when unit exists in related modules collection', () => {
      it('should behave as identity', () => {
        class Random {}
        untypedModuleRef._imports = new Set([
          new Module(Random, new NestContainer()),
        ]);
        expect(moduleRef.validateExportedProvider(Random)).toEqual(Random);
      });
    });
    describe('when unit does not exist in both provider and related modules collections', () => {
      it('should throw UnknownExportException', () => {
        expect(() => moduleRef.validateExportedProvider(token)).toThrow(
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
        expect(moduleRef.hasProvider(token)).toBe(true);
      });
    });
    describe('otherwise', () => {
      it('should return false', () => {
        expect(moduleRef.hasProvider('_')).toBe(false);
      });
    });
  });

  describe('hasInjectable', () => {
    describe('when module has injectable', () => {
      it('should return true', () => {
        const token = 'test';
        moduleRef.injectables.set(token, new InstanceWrapper());
        expect(moduleRef.hasInjectable(token)).toBe(true);
      });
    });
    describe('otherwise', () => {
      it('should return false', () => {
        expect(moduleRef.hasInjectable('_')).toBe(false);
      });
    });
  });

  describe('getter "id"', () => {
    it('should return module id', () => {
      expect(moduleRef.id).toBe(moduleRef['_id']);
    });
  });

  describe('getProviderByKey', () => {
    describe('when does not exist', () => {
      it('should return undefined', () => {
        expect(moduleRef.getProviderByKey('test')).toBeUndefined();
      });
    });
    describe('otherwise', () => {
      it('should return instance wrapper', () => {
        moduleRef.addProvider(TestProvider);
        expect(moduleRef.getProviderByKey(TestProvider)).not.toBeUndefined();
      });
    });
  });
});
