import { expect } from 'chai';
import * as sinon from 'sinon';
import { Injectable } from '../../../common';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import { NestContainer } from '../../injector/container';
import { Injector } from '../../injector/injector';
import { InstanceLoader } from '../../injector/instance-loader';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { GraphInspector } from '../../inspector/graph-inspector';

describe('InstanceLoader', () => {
  @Controller('')
  class TestCtrl {}

  @Injectable()
  class TestProvider {}

  let loader: InstanceLoader;
  let injector: Injector;
  let container: NestContainer;
  let graphInspector: GraphInspector;
  let inspectInstanceWrapperStub: sinon.SinonStub;
  let mockContainer: sinon.SinonMock;
  let moduleMock: Record<string, any>;

  beforeEach(() => {
    container = new NestContainer();
    graphInspector = new GraphInspector(container);

    inspectInstanceWrapperStub = sinon.stub(
      graphInspector,
      'inspectInstanceWrapper',
    );

    injector = new Injector();
    loader = new InstanceLoader(container, injector, graphInspector);
    mockContainer = sinon.mock(container);

    moduleMock = {
      imports: new Set(),
      providers: new Map(),
      controllers: new Map(),
      injectables: new Map(),
      exports: new Set(),
      metatype: { name: 'test' },
    };

    const modules = new Map();
    modules.set('Test', moduleMock);
    mockContainer.expects('getModules').returns(modules);
  });

  it('should call "loadPrototype" for every provider and controller in every module', async () => {
    const providerWrapper = new InstanceWrapper({
      instance: null,
      metatype: TestProvider,
      token: 'TestProvider',
    });
    const ctrlWrapper = new InstanceWrapper({
      instance: null,
      metatype: TestCtrl,
      token: 'TestRoute',
    });

    moduleMock.providers.set('TestProvider', providerWrapper);
    moduleMock.controllers.set('TestRoute', ctrlWrapper);

    const loadProviderPrototypeStub = sinon.stub(injector, 'loadPrototype');

    sinon.stub(injector, 'loadController');
    sinon.stub(injector, 'loadProvider');

    await loader.createInstancesOfDependencies();

    expect(
      loadProviderPrototypeStub.calledWith(
        providerWrapper,
        moduleMock.providers,
      ),
    ).to.be.true;
    expect(
      loadProviderPrototypeStub.calledWith(ctrlWrapper, moduleMock.controllers),
    ).to.be.true;
  });

  describe('for every provider in every module', () => {
    const testProviderToken = 'TestProvider';

    let loadProviderStub: sinon.SinonStub;

    beforeEach(async () => {
      const testProviderWrapper = new InstanceWrapper({
        instance: null,
        metatype: TestProvider,
        name: testProviderToken,
        token: testProviderToken,
      });
      moduleMock.providers.set(testProviderToken, testProviderWrapper);

      loadProviderStub = sinon.stub(injector, 'loadProvider');
      sinon.stub(injector, 'loadController');

      await loader.createInstancesOfDependencies();
    });

    it('should call "loadProvider"', async () => {
      expect(
        loadProviderStub.calledWith(
          moduleMock.providers.get(testProviderToken),
          moduleMock as any,
        ),
      ).to.be.true;
    });

    it('should call "inspectInstanceWrapper"', async () => {
      expect(
        inspectInstanceWrapperStub.calledWith(
          moduleMock.providers.get(testProviderToken),
          moduleMock as any,
        ),
      ).to.be.true;
    });
  });

  describe('for every controller in every module', () => {
    let loadControllerStub: sinon.SinonStub;

    beforeEach(async () => {
      const wrapper = new InstanceWrapper({
        name: 'TestRoute',
        token: 'TestRoute',
        instance: null,
        metatype: TestCtrl,
      });
      moduleMock.controllers.set('TestRoute', wrapper);

      sinon.stub(injector, 'loadProvider');
      loadControllerStub = sinon.stub(injector, 'loadController');

      await loader.createInstancesOfDependencies();
    });
    it('should call "loadController"', async () => {
      expect(
        loadControllerStub.calledWith(
          moduleMock.controllers.get('TestRoute'),
          moduleMock as any,
        ),
      ).to.be.true;
    });
    it('should call "inspectInstanceWrapper"', async () => {
      expect(
        inspectInstanceWrapperStub.calledWith(
          moduleMock.controllers.get('TestRoute'),
          moduleMock as any,
        ),
      ).to.be.true;
    });
  });

  describe('for every injectable in every module', () => {
    let loadInjectableStub: sinon.SinonStub;

    beforeEach(async () => {
      const testInjectable = new InstanceWrapper({
        instance: null,
        metatype: TestProvider,
        name: 'TestProvider',
        token: 'TestProvider',
      });
      moduleMock.injectables.set('TestProvider', testInjectable);

      loadInjectableStub = sinon.stub(injector, 'loadInjectable');
      sinon.stub(injector, 'loadController');

      await loader.createInstancesOfDependencies();
    });

    it('should call "loadInjectable"', async () => {
      expect(
        loadInjectableStub.calledWith(
          moduleMock.injectables.get('TestProvider'),
          moduleMock as any,
        ),
      ).to.be.true;
    });
    it('should call "inspectInstanceWrapper"', async () => {
      expect(
        inspectInstanceWrapperStub.calledWith(
          moduleMock.injectables.get('TestProvider'),
          moduleMock as any,
        ),
      ).to.be.true;
    });
  });
});
