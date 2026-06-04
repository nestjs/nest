import * as chai from 'chai';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as chaiAsPromised from 'chai-as-promised';
import { Scope } from '@nestjs/common';
import { Injector } from '@nestjs/core/injector/injector';
import { InstanceLoader } from '@nestjs/core/injector/instance-loader';
import { NestContainer } from '@nestjs/core/injector/container';
import { Module } from '@nestjs/core/injector/module';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { NoopGraphInspector } from '@nestjs/core/inspector/noop-graph-inspector';
import { STATIC_CONTEXT } from '@nestjs/core/injector/constants';
import { TestingInjector } from '../testing-injector';
import { TestingInstanceLoader } from '../testing-instance-loader';

chai.use(chaiAsPromised);

describe('TestingInjector', () => {
  let injector: TestingInjector;
  let container: NestContainer;
  let moduleRef: Module;

  beforeEach(() => {
    injector = new TestingInjector();
    container = new NestContainer();
    const coreModule = new Module(class InternalCoreModule {}, container);
    container.registerCoreModuleRef(coreModule);
    moduleRef = new Module(class TestModule {}, container);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('setMocker', () => {
    it('should store the mocker', () => {
      const mocker = () => ({});
      injector.setMocker(mocker);
      expect((injector as any).mocker).to.equal(mocker);
    });
  });

  describe('setContainer', () => {
    it('should store the container', () => {
      injector.setContainer(container);
      expect((injector as any).container).to.equal(container);
    });
  });

  describe('resolveComponentWrapper', () => {
    const name = 'TEST_PROVIDER';
    const dependencyContext = {} as any;
    const wrapper = new InstanceWrapper({
      name,
      metatype: class TestProvider {},
      scope: Scope.DEFAULT,
      instance: null,
      isResolved: false,
    });

    it('should delegate to super when resolution succeeds', async () => {
      const expectedResult = new InstanceWrapper({
        name,
        metatype: class TestProvider {},
        scope: Scope.DEFAULT,
        instance: { foo: 'bar' },
        isResolved: true,
      });
      const superStub = sinon
        .stub(Injector.prototype, 'resolveComponentWrapper')
        .resolves(expectedResult);

      const result = await injector.resolveComponentWrapper(
        moduleRef,
        name,
        dependencyContext,
        wrapper,
        { contextId: STATIC_CONTEXT },
      );

      expect(result).to.equal(expectedResult);
      expect(superStub.calledOnce).to.be.true;
    });

    it('should fall back to mocker when resolution fails and mocker provides a value', async () => {
      sinon
        .stub(Injector.prototype, 'resolveComponentWrapper')
        .rejects(new Error('not found'));
      injector.setContainer(container);
      injector.setMocker((token: any) => {
        if (token === name) {
          return { mocked: true };
        }
        return null;
      });

      const result = await injector.resolveComponentWrapper(
        moduleRef,
        name,
        dependencyContext,
        wrapper,
        { contextId: STATIC_CONTEXT },
      );

      expect(result.instance).to.deep.equal({ mocked: true });
    });

    it('should re-throw when resolution fails and no mocker is set', async () => {
      const originalErr = 'not found';
      sinon
        .stub(Injector.prototype, 'resolveComponentWrapper')
        .rejects(new Error(originalErr));
      injector.setContainer(container);

      await expect(
        injector.resolveComponentWrapper(
          moduleRef,
          name,
          dependencyContext,
          wrapper,
          { contextId: STATIC_CONTEXT },
        ),
      ).to.be.rejectedWith(Error, originalErr);
    });

    it('should re-throw when resolution fails and mocker returns null', async () => {
      const originalErr = 'not found';
      sinon
        .stub(Injector.prototype, 'resolveComponentWrapper')
        .rejects(new Error(originalErr));
      injector.setContainer(container);
      injector.setMocker(() => null);

      await expect(
        injector.resolveComponentWrapper(
          moduleRef,
          name,
          dependencyContext,
          wrapper,
          { contextId: STATIC_CONTEXT },
        ),
      ).to.be.rejectedWith(Error, originalErr);
    });
  });

  describe('resolveComponentHost', () => {
    const name = 'TEST_HOST_PROVIDER';
    const wrapper = new InstanceWrapper({
      name,
      metatype: class TestHost {},
      scope: Scope.DEFAULT,
      instance: null,
      isResolved: false,
    });

    it('should delegate to super when resolution succeeds', async () => {
      const expectedResult = new InstanceWrapper({
        name,
        metatype: class TestHost {},
        scope: Scope.DEFAULT,
        instance: { result: 'success' },
        isResolved: true,
      });
      sinon
        .stub(Injector.prototype, 'resolveComponentHost')
        .resolves(expectedResult);

      const result = await injector.resolveComponentHost(moduleRef, wrapper, {
        contextId: STATIC_CONTEXT,
      });

      expect(result).to.equal(expectedResult);
    });

    it('should fall back to mocker when resolution fails', async () => {
      sinon
        .stub(Injector.prototype, 'resolveComponentHost')
        .rejects(new Error('not found'));
      injector.setContainer(container);
      injector.setMocker(() => ({ mockedHost: true }));

      const result = await injector.resolveComponentHost(moduleRef, wrapper, {
        contextId: STATIC_CONTEXT,
      });

      expect(result.instance).to.deep.equal({ mockedHost: true });
    });

    it('should re-throw when resolution fails and no mocker is set', async () => {
      sinon
        .stub(Injector.prototype, 'resolveComponentHost')
        .rejects(new Error('host not found'));
      injector.setContainer(container);

      await expect(
        injector.resolveComponentHost(moduleRef, wrapper, {
          contextId: STATIC_CONTEXT,
        }),
      ).to.be.rejectedWith(Error, 'host not found');
    });
  });
});

describe('TestingInstanceLoader', () => {
  let container: NestContainer;
  let injector: TestingInjector;
  let loader: TestingInstanceLoader;

  beforeEach(() => {
    container = new NestContainer();
    injector = new TestingInjector();
    loader = new TestingInstanceLoader(container, injector, NoopGraphInspector);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('createInstancesOfDependencies', () => {
    it('should set container and mocker on injector', async () => {
      const setContainerSpy = sinon.spy(injector, 'setContainer');
      const setMockerSpy = sinon.spy(injector, 'setMocker');
      const mocker = () => ({});
      sinon
        .stub(InstanceLoader.prototype, 'createInstancesOfDependencies')
        .resolves();

      await loader.createInstancesOfDependencies(new Map(), mocker);

      expect(setContainerSpy.calledOnce).to.be.true;
      expect(setContainerSpy.firstCall.args[0]).to.equal(container);
      expect(setMockerSpy.calledOnce).to.be.true;
      expect(setMockerSpy.firstCall.args[0]).to.equal(mocker);
    });

    it('should not set mocker when not provided', async () => {
      const setMockerSpy = sinon.spy(injector, 'setMocker');
      sinon
        .stub(InstanceLoader.prototype, 'createInstancesOfDependencies')
        .resolves();

      await loader.createInstancesOfDependencies(new Map());

      expect(setMockerSpy.called).to.be.false;
    });

    it('should delegate to super.createInstancesOfDependencies', async () => {
      const superStub = sinon
        .stub(InstanceLoader.prototype, 'createInstancesOfDependencies')
        .resolves();

      await loader.createInstancesOfDependencies(new Map(), () => ({}));

      expect(superStub.calledOnce).to.be.true;
    });
  });
});
