import { expect } from 'chai';
import * as sinon from 'sinon';
import { Injectable } from '../../../common';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import { NestContainer } from '../../injector/container';
import { Injector } from '../../injector/injector';
import { InstanceLoader } from '../../injector/instance-loader';
import { InstanceWrapper } from '../../injector/instance-wrapper';

describe('InstanceLoader', () => {
  let loader: InstanceLoader;
  let container: NestContainer;
  let mockContainer: sinon.SinonMock;

  @Controller('')
  class TestRoute {}

  @Injectable()
  class TestProvider {}

  beforeEach(() => {
    container = new NestContainer();
    loader = new InstanceLoader(container);
    mockContainer = sinon.mock(container);
  });

  it('should call "loadPrototype" for each provider and route in each module', async () => {
    const injector = new Injector();
    (loader as any).injector = injector;

    const module = {
      providers: new Map(),
      controllers: new Map(),
      injectables: new Map(),
      metatype: { name: 'test' },
    };
    const providerWrapper: InstanceWrapper = {
      instance: null,
      metatype: TestProvider,
      token: 'TestProvider',
    } as any;
    const routeWrapper: InstanceWrapper = {
      instance: null,
      metatype: TestRoute,
      token: 'TestRoute',
    } as any;

    module.providers.set('TestProvider', providerWrapper);
    module.controllers.set('TestRoute', routeWrapper);

    const modules = new Map();
    modules.set('Test', module);
    mockContainer.expects('getModules').returns(modules);

    const loadProviderPrototypeStub = sinon.stub(injector, 'loadPrototype');

    sinon.stub(injector, 'loadController');
    sinon.stub(injector, 'loadProvider');

    await loader.createInstancesOfDependencies();
    expect(
      loadProviderPrototypeStub.calledWith(providerWrapper, module.providers),
    ).to.be.true;
    expect(
      loadProviderPrototypeStub.calledWith(routeWrapper, module.controllers),
    ).to.be.true;
  });

  it('should call "loadProvider" for each provider in each module', async () => {
    const injector = new Injector();
    (loader as any).injector = injector;

    const module = {
      providers: new Map(),
      controllers: new Map(),
      injectables: new Map(),
      metatype: { name: 'test' },
    };
    const testComp = new InstanceWrapper({
      instance: null,
      metatype: TestProvider,
      name: 'TestProvider',
      token: 'TestProvider',
    });
    module.providers.set('TestProvider', testComp);

    const modules = new Map();
    modules.set('Test', module);
    mockContainer.expects('getModules').returns(modules);

    const loadProviderStub = sinon.stub(injector, 'loadProvider');
    sinon.stub(injector, 'loadController');

    await loader.createInstancesOfDependencies();
    expect(
      loadProviderStub.calledWith(
        module.providers.get('TestProvider'),
        module as any,
      ),
    ).to.be.true;
  });

  it('should call "loadController" for each route in each module', async () => {
    const injector = new Injector();
    (loader as any).injector = injector;

    const module = {
      providers: new Map(),
      controllers: new Map(),
      injectables: new Map(),
      metatype: { name: 'test' },
    };
    const wrapper = new InstanceWrapper({
      name: 'TestRoute',
      token: 'TestRoute',
      instance: null,
      metatype: TestRoute,
    });
    module.controllers.set('TestRoute', wrapper);

    const modules = new Map();
    modules.set('Test', module);
    mockContainer.expects('getModules').returns(modules);

    sinon.stub(injector, 'loadProvider');
    const loadRoutesStub = sinon.stub(injector, 'loadController');

    await loader.createInstancesOfDependencies();
    expect(
      loadRoutesStub.calledWith(
        module.controllers.get('TestRoute'),
        module as any,
      ),
    ).to.be.true;
  });

  it('should call "loadInjectable" for each injectable in each module', async () => {
    const injector = new Injector();
    (loader as any).injector = injector;

    const module = {
      providers: new Map(),
      controllers: new Map(),
      injectables: new Map(),
      metatype: { name: 'test' },
    };
    const testComp = new InstanceWrapper({
      instance: null,
      metatype: TestProvider,
      name: 'TestProvider',
      token: 'TestProvider',
    });
    module.injectables.set('TestProvider', testComp);

    const modules = new Map();
    modules.set('Test', module);
    mockContainer.expects('getModules').returns(modules);

    const loadInjectableStub = sinon.stub(injector, 'loadInjectable');
    sinon.stub(injector, 'loadController');

    await loader.createInstancesOfDependencies();
    expect(
      loadInjectableStub.calledWith(
        module.injectables.get('TestProvider'),
        module as any,
      ),
    ).to.be.true;
  });
});
