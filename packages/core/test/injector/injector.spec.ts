import * as sinon from 'sinon';
import { expect } from 'chai';
import { InstanceWrapper, NestContainer } from '../../injector/container';
import { Injector } from '../../injector/injector';
import { Component } from '../../../common/decorators/core/component.decorator';
import { RuntimeException } from '../../errors/exceptions/runtime.exception';
import { Module } from '../../injector/module';
import { UnknownDependenciesException } from '../../errors/exceptions/unknown-dependencies.exception';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { UndefinedDependencyException } from '../../errors/exceptions/undefined-dependency.exception';
chai.use(chaiAsPromised);

describe('Injector', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector();
  });

  describe('loadInstance', () => {
    @Component()
    class DependencyOne {}

    @Component()
    class DependencyTwo {}

    @Component()
    class MainTest {
      constructor(public depOne: DependencyOne, public depTwo: DependencyTwo) {}
    }

    let moduleDeps: Module;
    let mainTest, depOne, depTwo;

    beforeEach(() => {
      moduleDeps = new Module(DependencyTwo as any, [], new NestContainer());
      mainTest = {
        name: 'MainTest',
        metatype: MainTest,
        instance: Object.create(MainTest.prototype),
        isResolved: false,
      };
      depOne = {
        name: 'DependencyOne',
        metatype: DependencyOne,
        instance: Object.create(DependencyOne.prototype),
        isResolved: false,
      };
      depTwo = {
        name: 'DependencyTwo',
        metatype: DependencyTwo,
        instance: Object.create(DependencyOne.prototype),
        isResolved: false,
      };
      moduleDeps.components.set('MainTest', mainTest);
      moduleDeps.components.set('DependencyOne', depOne);
      moduleDeps.components.set('DependencyTwo', depTwo);
      moduleDeps.components.set('MainTestResolved', {
        ...mainTest,
        isResolved: true,
      });
    });

    it('should create an instance of component with proper dependencies', async () => {
      await injector.loadInstance(mainTest, moduleDeps.components, moduleDeps);
      const { instance } = moduleDeps.components.get(
        'MainTest',
      ) as InstanceWrapper<MainTest>;

      expect(instance.depOne).instanceof(DependencyOne);
      expect(instance.depTwo).instanceof(DependencyOne);
      expect(instance).instanceof(MainTest);
    });

    it('should set "isResolved" property to true after instance initialization', async () => {
      await injector.loadInstance(mainTest, moduleDeps.components, moduleDeps);
      const { isResolved } = moduleDeps.components.get(
        'MainTest',
      ) as InstanceWrapper<MainTest>;
      expect(isResolved).to.be.true;
    });

    it('should throw RuntimeException when type is not stored in collection', () => {
      return expect(
        injector.loadInstance({} as any, moduleDeps.components, moduleDeps),
      ).to.eventually.be.rejected;
    });

    it('should await done$ when "isPending"', async () => {
      const value = 'test';
      const result = await injector.loadInstance(
        {
          name: 'MainTest',
          metatype: MainTest,
          instance: Object.create(MainTest.prototype),
          isResolved: false,
          isPending: true,
          done$: Promise.resolve(value) as any,
        },
        moduleDeps.components,
        moduleDeps,
      );
      expect(result).to.be.eql(value);
    });

    it('should return null when metatype is resolved', async () => {
      const value = 'test';
      const result = await injector.loadInstance(
        {
          name: 'MainTestResolved',
          metatype: MainTest,
          instance: Object.create(MainTest.prototype),
          isResolved: true,
        },
        moduleDeps.components,
        moduleDeps,
      );
      expect(result).to.be.null;
    });
  });

  describe('loadPrototypeOfInstance', () => {
    @Component()
    class Test {}

    let moduleDeps: Module;
    let test;

    beforeEach(() => {
      moduleDeps = new Module(Test as any, [], new NestContainer());
      test = {
        name: 'Test',
        metatype: Test,
        instance: Object.create(Test.prototype),
        isResolved: false,
      };
      moduleDeps.components.set('Test', test);
    });

    it('should create prototype of instance', () => {
      const expectedResult = {
        instance: Object.create(Test.prototype),
        isResolved: false,
        metatype: Test,
        name: 'Test',
      };
      injector.loadPrototypeOfInstance(test, moduleDeps.components);
      expect(moduleDeps.components.get('Test')).to.deep.equal(expectedResult);
    });

    it('should return null when collection is nil', () => {
      const result = injector.loadPrototypeOfInstance(test, null);
      expect(result).to.be.null;
    });

    it('should return null when target isResolved', () => {
      const collection = {
        get: () => ({ isResolved: true }),
      };
      const result = injector.loadPrototypeOfInstance(test, collection as any);
      expect(result).to.be.null;
    });

    it('should return null when "inject" is not nil', () => {
      const collection = {
        get: () => ({ inject: [] }),
      };
      const result = injector.loadPrototypeOfInstance(test, collection as any);
      expect(result).to.be.null;
    });
  });

  describe('resolveSingleParam', () => {
    it('should throw "RuntimeException" when param is undefined', async () => {
      return expect(
        injector.resolveSingleParam(
          null,
          undefined,
          { index: 0, length: 5 },
          null,
        ),
      ).to.eventually.be.rejected;
    });
  });

  describe('loadInstanceOfMiddleware', () => {
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

      injector.loadInstanceOfMiddleware(
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

      injector.loadInstanceOfMiddleware(
        { metatype: { name: '' } } as any,
        collection as any,
        null,
      );
      expect(resolveConstructorParams.called).to.be.false;
    });
  });

  describe('loadInstanceOfRoute', () => {
    let loadInstance: sinon.SinonSpy;

    beforeEach(() => {
      loadInstance = sinon.spy();
      injector.loadInstance = loadInstance;
    });

    it('should call "loadInstance" with expected arguments', async () => {
      const module = { routes: [] };
      const wrapper = { test: 'test' };

      await injector.loadInstanceOfRoute(wrapper as any, module as any);
      expect(loadInstance.calledWith(wrapper, module.routes, module)).to.be
        .true;
    });
  });

  describe('loadInstanceOfInjectable', () => {
    let loadInstance: sinon.SinonSpy;

    beforeEach(() => {
      loadInstance = sinon.spy();
      injector.loadInstance = loadInstance;
    });

    it('should call "loadInstance" with expected arguments', async () => {
      const module = { injectables: [] };
      const wrapper = { test: 'test' };

      await injector.loadInstanceOfInjectable(wrapper as any, module as any);
      expect(loadInstance.calledWith(wrapper, module.injectables, module)).to.be
        .true;
    });
  });

  describe('resolveFactoryInstance', () => {
    it('should resolve deffered value', async () => {
      const wrapper = { test: 'test' };
      const result = await injector.resolveFactoryInstance(
        Promise.resolve(wrapper),
      );
      expect(result).to.be.eql(wrapper);
    });
    it('should return exact same value', async () => {
      const wrapper = { test: 'test' };
      const result = await injector.resolveFactoryInstance(wrapper);
      expect(result).to.be.eql(wrapper);
    });
  });

  describe('lookupComponent', () => {
    let lookupComponentInRelatedModules: sinon.SinonStub;
    const metatype = { name: 'test', metatype: { name: 'test' } };

    beforeEach(() => {
      lookupComponentInRelatedModules = sinon.stub();
      (injector as any).lookupComponentInRelatedModules = lookupComponentInRelatedModules;
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
        { name: metatype.name, index: 0, length: 10 },
        metatype,
      );
      expect(result).to.be.equal(instance);
    });

    it('should call "lookupComponentInRelatedModules" when object is not in collection', async () => {
      lookupComponentInRelatedModules.returns({});
      const collection = {
        has: () => false,
      };
      await injector.lookupComponent(
        collection as any,
        null,
        { name: metatype.name, index: 0, length: 10 },
        metatype,
      );
      expect(lookupComponentInRelatedModules.called).to.be.true;
    });

    it('should throw "UnknownDependenciesException" when instanceWrapper is null and "exports" collection does not contain token', () => {
      lookupComponentInRelatedModules.returns(null);
      const collection = {
        has: () => false,
      };
      const module = { exports: collection };
      expect(
        injector.lookupComponent(
          collection as any,
          module as any,
          { name: metatype.name, index: 0, length: 10 },
          { metatype },
        ),
      ).to.eventually.be.rejected;
    });

    it('should not throw "UnknownDependenciesException" instanceWrapper is not null', () => {
      lookupComponentInRelatedModules.returns({});
      const collection = {
        has: () => false,
      };
      const module = { exports: collection };
      expect(
        injector.lookupComponent(
          collection as any,
          module as any,
          { name: metatype.name, index: 0, length: 10 },
          metatype,
        ),
      ).to.eventually.be.not.rejected;
    });
  });

  describe('lookupComponentInRelatedModules', () => {
    let loadInstanceOfComponent: sinon.SinonSpy;
    const metatype = { name: 'test' };
    const module = {
      relatedModules: new Map(),
    };

    beforeEach(() => {
      loadInstanceOfComponent = sinon.spy();
      (injector as any).loadInstanceOfComponent = loadInstanceOfComponent;
    });

    it('should return null when there is no related modules', async () => {
      const result = await injector.lookupComponentInRelatedModules(
        module as any,
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
              components: {
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
        injector.lookupComponentInRelatedModules(
          module as any,
          metatype as any,
        ),
      ).to.be.eventually.eq(null);

      module = {
        relatedModules: new Map([
          [
            'key',
            {
              components: {
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
        injector.lookupComponentInRelatedModules(
          module as any,
          metatype as any,
        ),
      ).to.eventually.be.eq(null);
    });

    it('should call "loadInstanceOfComponent" when component is not resolved', async () => {
      let module = {
        relatedModules: new Map([
          [
            'key',
            {
              components: {
                has: () => true,
                get: () => ({
                  isResolved: false,
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
      await injector.lookupComponentInRelatedModules(
        module as any,
        metatype as any,
      );
      expect(loadInstanceOfComponent.called).to.be.true;
    });

    it('should not call "loadInstanceOfComponent" when component is resolved', async () => {
      let module = {
        relatedModules: new Map([
          [
            'key',
            {
              components: {
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
      await injector.lookupComponentInRelatedModules(
        module as any,
        metatype as any,
      );
      expect(loadInstanceOfComponent.called).to.be.false;
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
      it('should call loadInstanceOfComponent', async () => {
        const loadStub = sinon
          .stub(injector, 'loadInstanceOfComponent')
          .callsFake(() => null);
        sinon.stub(injector, 'lookupComponent').returns({ isResolved: false });

        await injector.resolveComponentInstance(
          module,
          '',
          { index: 0, length: 10 },
          {} as any,
        );
        expect(loadStub.called).to.be.true;
      });
      it('should not call loadInstanceOfComponent (isResolved)', async () => {
        const loadStub = sinon
          .stub(injector, 'loadInstanceOfComponent')
          .callsFake(() => null);
        sinon.stub(injector, 'lookupComponent').returns({ isResolved: true });

        await injector.resolveComponentInstance(
          module,
          '',
          { index: 0, length: 10 },
          {} as any,
        );
        expect(loadStub.called).to.be.false;
      });
      it('should not call loadInstanceOfComponent (forwardRef)', async () => {
        const loadStub = sinon
          .stub(injector, 'loadInstanceOfComponent')
          .callsFake(() => null);
        sinon
          .stub(injector, 'lookupComponent')
          .returns({ isResolved: false, forwardRef: true });

        await injector.resolveComponentInstance(
          module,
          '',
          { index: 0, length: 10 },
          {} as any,
        );
        expect(loadStub.called).to.be.false;
      });
    });

    describe('when instanceWraper has async property', () => {
      it('should await instance', async () => {
        const loadStub = sinon
          .stub(injector, 'loadInstanceOfComponent')
          .callsFake(() => null);

        const instance = Promise.resolve(true);
        sinon.stub(injector, 'lookupComponent').returns({
          isResolved: false,
          forwardRef: true,
          async: true,
          instance,
        });
        const result = await injector.resolveComponentInstance(
          module,
          '',
          { index: 0, length: 10 },
          {} as any,
        );
        expect(result.instance).to.be.true;
      });
    });
  });
});
