import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import { Inject } from '../../../common/decorators/core/inject.decorator';
import { Injectable } from '../../../common/decorators/core/injectable.decorator';
import { STATIC_CONTEXT } from '../../injector/constants';
import { NestContainer } from '../../injector/container';
import { Injector, PropertyDependency } from '../../injector/injector';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { Module } from '../../injector/module';
chai.use(chaiAsPromised);

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
      @Inject() property: DependencyOne;

      constructor(public depOne: DependencyOne, public depTwo: DependencyTwo) {}
    }

    let moduleDeps: Module;
    let mainTest, depOne, depTwo;

    beforeEach(() => {
      moduleDeps = new Module(DependencyTwo as any, [], new NestContainer());
      mainTest = new InstanceWrapper({
        name: 'MainTest',
        metatype: MainTest,
        instance: Object.create(MainTest.prototype),
        isResolved: false,
      });
      depOne = new InstanceWrapper({
        name: 'DependencyOne',
        metatype: DependencyOne,
        instance: Object.create(DependencyOne.prototype),
        isResolved: false,
      });
      depTwo = new InstanceWrapper({
        name: 'DependencyTwo',
        metatype: DependencyTwo,
        instance: Object.create(DependencyOne.prototype),
        isResolved: false,
      });
      moduleDeps.providers.set('MainTest', mainTest);
      moduleDeps.providers.set('DependencyOne', depOne);
      moduleDeps.providers.set('DependencyTwo', depTwo);
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

      expect(instance.depOne).instanceof(DependencyOne);
      expect(instance.depTwo).instanceof(DependencyTwo);
      expect(instance).instanceof(MainTest);
    });

    it('should set "isResolved" property to true after instance initialization', async () => {
      await injector.loadInstance(mainTest, moduleDeps.providers, moduleDeps);
      const { isResolved } = (moduleDeps.providers.get(
        'MainTest',
      ) as InstanceWrapper<MainTest>).getInstanceByContextId(STATIC_CONTEXT);
      expect(isResolved).to.be.true;
    });

    it('should throw RuntimeException when type is not stored in collection', () => {
      return expect(
        injector.loadInstance({} as any, moduleDeps.providers, moduleDeps),
      ).to.eventually.be.rejected;
    });

    it('should await done$ when "isPending"', async () => {
      const value = 'test';
      const wrapper = new InstanceWrapper({
        name: 'MainTest',
        metatype: MainTest,
        instance: Object.create(MainTest.prototype),
        isResolved: false,
      });
      const host = wrapper.getInstanceByContextId(STATIC_CONTEXT);
      host.donePromise = Promise.resolve(value) as any;
      host.isPending = true;

      const result = await injector.loadInstance(
        wrapper,
        moduleDeps.providers,
        moduleDeps,
      );
      expect(result).to.be.eql(value);
    });

    it('should return undefined when metatype is resolved', async () => {
      const value = 'test';
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
      expect(result).to.be.undefined;
    });
  });

  describe('loadPrototype', () => {
    @Injectable()
    class Test {}

    let moduleDeps: Module;
    let test;

    beforeEach(() => {
      moduleDeps = new Module(Test as any, [], new NestContainer());
      test = new InstanceWrapper({
        name: 'Test',
        metatype: Test,
        instance: null,
        isResolved: false,
      });
      moduleDeps.providers.set('Test', test);
    });

    it('should create prototype of instance', () => {
      injector.loadPrototype(test, moduleDeps.providers);
      expect(moduleDeps.providers.get('Test').instance).to.deep.equal(
        Object.create(Test.prototype),
      );
    });

    it('should return null when collection is nil', () => {
      const result = injector.loadPrototype(test, null);
      expect(result).to.be.null;
    });

    it('should return null when target isResolved', () => {
      const collection = {
        get: () => ({ getInstanceByContextId: () => ({ isResolved: true }) }),
      };
      const result = injector.loadPrototype(test, collection as any);
      expect(result).to.be.null;
    });

    it('should return null when "inject" is not nil', () => {
      const collection = {
        get: () => new InstanceWrapper({ inject: [] }),
      };
      const result = injector.loadPrototype(test, collection as any);
      expect(result).to.be.null;
    });
  });

  describe('resolveSingleParam', () => {
    it('should throw "RuntimeException" when param is undefined', async () => {
      return expect(
        injector.resolveSingleParam(
          null,
          undefined,
          { index: 0, dependencies: [] },
          null,
        ),
      ).to.eventually.be.rejected;
    });
  });

  describe('loadMiddleware', () => {
    let resolveConstructorParams: sinon.SinonSpy;

    beforeEach(() => {
      resolveConstructorParams = sinon.spy();
      injector.resolveConstructorParams = resolveConstructorParams;
    });

    it('should call "resolveConstructorParams" when instance is not resolved', () => {
      const collection = {
        get: (...args) => ({
          instance: null,
        }),
        set: (...args) => {},
      };

      injector.loadMiddleware(
        { metatype: { name: '' } } as any,
        collection as any,
        null,
      );
      expect(resolveConstructorParams.called).to.be.true;
    });

    it('should not call "resolveConstructorParams" when instance is not resolved', () => {
      const collection = {
        get: (...args) => ({
          instance: {},
        }),
        set: (...args) => {},
      };

      injector.loadMiddleware(
        { metatype: { name: '' } } as any,
        collection as any,
        null,
      );
      expect(resolveConstructorParams.called).to.be.false;
    });
  });

  describe('loadController', () => {
    let loadInstance: sinon.SinonSpy;

    beforeEach(() => {
      loadInstance = sinon.spy();
      injector.loadInstance = loadInstance;
    });

    it('should call "loadInstance" with expected arguments', async () => {
      const module = { controllers: [] };
      const wrapper = { test: 'test' };

      await injector.loadController(wrapper as any, module as any);
      expect(loadInstance.calledWith(wrapper, module.controllers, module)).to.be
        .true;
    });
  });

  describe('loadInjectable', () => {
    let loadInstance: sinon.SinonSpy;

    beforeEach(() => {
      loadInstance = sinon.spy();
      injector.loadInstance = loadInstance;
    });

    it('should call "loadInstance" with expected arguments', async () => {
      const module = { injectables: [] };
      const wrapper = { test: 'test' };

      await injector.loadInjectable(wrapper as any, module as any);
      expect(loadInstance.calledWith(wrapper, module.injectables, module)).to.be
        .true;
    });
  });

  describe('lookupComponent', () => {
    let lookupComponentInImports: sinon.SinonStub;
    const metatype = { name: 'test', metatype: { name: 'test' } };
    const wrapper: any = {
      name: 'Test',
      metatype,
      instance: null,
      isResolved: false,
    };
    beforeEach(() => {
      lookupComponentInImports = sinon.stub();
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
        null,
        { name: metatype.name, index: 0, dependencies: [] },
        wrapper,
      );
      expect(result).to.be.equal(instance);
    });

    it('should call "lookupComponentInImports" when object is not in collection', async () => {
      lookupComponentInImports.returns({});
      const collection = {
        has: () => false,
      };
      await injector.lookupComponent(
        collection as any,
        null,
        { name: metatype.name, index: 0, dependencies: [] },
        wrapper,
      );
      expect(lookupComponentInImports.called).to.be.true;
    });

    it('should throw "UnknownDependenciesException" when instanceWrapper is null and "exports" collection does not contain token', () => {
      lookupComponentInImports.returns(null);
      const collection = {
        has: () => false,
      };
      const module = { exports: collection };
      expect(
        injector.lookupComponent(
          collection as any,
          module as any,
          { name: metatype.name, index: 0, dependencies: [] },
          wrapper,
        ),
      ).to.eventually.be.rejected;
    });

    it('should not throw "UnknownDependenciesException" instanceWrapper is not null', () => {
      lookupComponentInImports.returns({});
      const collection = {
        has: () => false,
      };
      const module = { exports: collection };
      expect(
        injector.lookupComponent(
          collection as any,
          module as any,
          { name: metatype.name, index: 0, dependencies: [] },
          wrapper,
        ),
      ).to.eventually.be.not.rejected;
    });
  });

  describe('lookupComponentInImports', () => {
    let loadProvider: sinon.SinonSpy;
    const metatype = { name: 'test' };
    const module = {
      relatedModules: new Map(),
    };

    beforeEach(() => {
      loadProvider = sinon.spy();
      (injector as any).loadProvider = loadProvider;
    });

    it('should return null when there is no related modules', async () => {
      const result = await injector.lookupComponentInImports(
        module as any,
        null,
        null,
      );
      expect(result).to.be.eq(null);
    });

    it('should return null when related modules do not have appropriate component', () => {
      let module = {
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
      expect(
        injector.lookupComponentInImports(module as any, metatype as any, null),
      ).to.be.eventually.eq(null);

      module = {
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
      expect(
        injector.lookupComponentInImports(module as any, metatype as any, null),
      ).to.eventually.be.eq(null);
    });

    it('should call "loadProvider" when component is not resolved', async () => {
      const module = {
        imports: new Map([
          [
            'key',
            {
              providers: {
                has: () => true,
                get: () =>
                  new InstanceWrapper({
                    isResolved: false,
                  }),
              },
              exports: {
                has: () => true,
              },
              imports: new Map(),
            },
          ],
        ] as any),
      };
      await injector.lookupComponentInImports(
        module as any,
        metatype as any,
        null,
      );
      expect(loadProvider.called).to.be.true;
    });

    it('should not call "loadProvider" when component is resolved', async () => {
      const module = {
        relatedModules: new Map([
          [
            'key',
            {
              providers: {
                has: () => true,
                get: () => ({
                  isResolved: true,
                }),
              },
              exports: {
                has: () => true,
              },
              relatedModules: new Map(),
            },
          ],
        ] as any),
      };
      await injector.lookupComponentInImports(
        module as any,
        metatype as any,
        null,
      );
      expect(loadProvider.called).to.be.false;
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
        expect(injector.resolveParamToken(wrapper, param)).to.be.eql(
          forwardRef,
        );
      });
      it('set wrapper "forwardRef" property to true', () => {
        injector.resolveParamToken(wrapper, param);
        expect(wrapper.forwardRef).to.be.true;
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
        expect(wrapper.forwardRef).to.be.undefined;
      });
      it('return param', () => {
        expect(injector.resolveParamToken(wrapper, param)).to.be.eql(param);
      });
    });
  });

  describe('resolveComponentInstance', () => {
    let module;
    beforeEach(() => {
      module = {
        providers: [],
      };
    });

    describe('when instanceWrapper is not resolved and does not have forward ref', () => {
      it('should call loadProvider', async () => {
        const loadStub = sinon
          .stub(injector, 'loadProvider')
          .callsFake(() => null);
        sinon
          .stub(injector, 'lookupComponent')
          .returns(new InstanceWrapper({ isResolved: false }));

        await injector.resolveComponentInstance(
          module,
          '',
          { index: 0, dependencies: [] },
          {} as any,
        );
        expect(loadStub.called).to.be.true;
      });
      it('should not call loadProvider (isResolved)', async () => {
        const loadStub = sinon
          .stub(injector, 'loadProvider')
          .callsFake(() => null);
        sinon
          .stub(injector, 'lookupComponent')
          .returns(new InstanceWrapper({ isResolved: true }));

        await injector.resolveComponentInstance(
          module,
          '',
          { index: 0, dependencies: [] },
          {} as any,
        );
        expect(loadStub.called).to.be.false;
      });
      it('should not call loadProvider (forwardRef)', async () => {
        const loadStub = sinon
          .stub(injector, 'loadProvider')
          .callsFake(() => null);
        sinon
          .stub(injector, 'lookupComponent')
          .returns(
            new InstanceWrapper({ isResolved: false, forwardRef: true }),
          );

        await injector.resolveComponentInstance(
          module,
          '',
          { index: 0, dependencies: [] },
          {} as any,
        );
        expect(loadStub.called).to.be.false;
      });
    });

    describe('when instanceWraper has async property', () => {
      it('should await instance', async () => {
        const loadStub = sinon
          .stub(injector, 'loadProvider')
          .callsFake(() => null);

        const instance = Promise.resolve(true);
        sinon.stub(injector, 'lookupComponent').returns(
          new InstanceWrapper({
            isResolved: false,
            forwardRef: true,
            async: true,
            instance,
          }),
        );
        const result = await injector.resolveComponentInstance(
          module,
          '',
          { index: 0, dependencies: [] },
          {} as any,
        );
        expect(result.instance).to.be.true;
      });
    });
  });
  describe('applyProperties', () => {
    describe('when instance is not an object', () => {
      it('should return undefined', () => {
        expect(injector.applyProperties('test', [])).to.be.undefined;
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

        expect(obj.one).to.be.eql(properties[0].instance);
        expect(obj.two).to.be.undefined;
        expect(obj.three).to.be.eql(properties[2].instance);
      });
    });
  });
});
