import { Controller } from '../../../common/decorators/core/controller.decorator.js';
import { Injectable } from '../../../common/index.js';
import { NestContainer } from '../../injector/container.js';
import { Injector } from '../../injector/injector.js';
import { InstanceLoader } from '../../injector/instance-loader.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { GraphInspector } from '../../inspector/graph-inspector.js';

describe('InstanceLoader', () => {
  @Controller('')
  class TestCtrl {}

  @Injectable()
  class TestProvider {}

  let loader: InstanceLoader;
  let injector: Injector;
  let container: NestContainer;
  let graphInspector: GraphInspector;
  let inspectInstanceWrapperStub: ReturnType<typeof vi.fn>;
  let moduleMock: Record<string, any>;

  beforeEach(() => {
    container = new NestContainer();
    graphInspector = new GraphInspector(container);

    inspectInstanceWrapperStub = vi.spyOn(
      graphInspector,
      'inspectInstanceWrapper',
    );

    injector = new Injector();
    loader = new InstanceLoader(container, injector, graphInspector);

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
    vi.spyOn(container, 'getModules').mockReturnValue(modules);
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

    const loadProviderPrototypeStub = vi
      .spyOn(injector, 'loadPrototype')
      .mockImplementation(() => ({}) as any);

    vi.spyOn(injector, 'loadController').mockImplementation(() => ({}) as any);
    vi.spyOn(injector, 'loadProvider').mockImplementation(() => ({}) as any);

    await loader.createInstancesOfDependencies();

    expect(loadProviderPrototypeStub).toHaveBeenCalledWith(
      providerWrapper,
      moduleMock.providers,
    );
    expect(loadProviderPrototypeStub).toHaveBeenCalledWith(
      ctrlWrapper,
      moduleMock.controllers,
    );
  });

  describe('for every provider in every module', () => {
    const testProviderToken = 'TestProvider';

    let loadProviderStub: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      const testProviderWrapper = new InstanceWrapper({
        instance: null,
        metatype: TestProvider,
        name: testProviderToken,
        token: testProviderToken,
      });
      moduleMock.providers.set(testProviderToken, testProviderWrapper);

      loadProviderStub = vi
        .spyOn(injector, 'loadProvider')
        .mockImplementation(() => ({}) as any);
      vi.spyOn(injector, 'loadController').mockImplementation(
        () => ({}) as any,
      );

      await loader.createInstancesOfDependencies();
    });

    it('should call "loadProvider"', async () => {
      expect(loadProviderStub).toHaveBeenCalledWith(
        moduleMock.providers.get(testProviderToken),
        moduleMock as any,
      );
    });

    it('should call "inspectInstanceWrapper"', async () => {
      expect(inspectInstanceWrapperStub).toHaveBeenCalledWith(
        moduleMock.providers.get(testProviderToken),
        moduleMock as any,
      );
    });
  });

  describe('for every controller in every module', () => {
    let loadControllerStub: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      const wrapper = new InstanceWrapper({
        name: 'TestRoute',
        token: 'TestRoute',
        instance: null,
        metatype: TestCtrl,
      });
      moduleMock.controllers.set('TestRoute', wrapper);

      vi.spyOn(injector, 'loadProvider').mockImplementation(() => ({}) as any);
      loadControllerStub = vi
        .spyOn(injector, 'loadController')
        .mockImplementation(() => ({}) as any);

      await loader.createInstancesOfDependencies();
    });
    it('should call "loadController"', async () => {
      expect(loadControllerStub).toHaveBeenCalledWith(
        moduleMock.controllers.get('TestRoute'),
        moduleMock as any,
      );
    });
    it('should call "inspectInstanceWrapper"', async () => {
      expect(inspectInstanceWrapperStub).toHaveBeenCalledWith(
        moduleMock.controllers.get('TestRoute'),
        moduleMock as any,
      );
    });
  });

  describe('for every injectable in every module', () => {
    let loadInjectableStub: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      const testInjectable = new InstanceWrapper({
        instance: null,
        metatype: TestProvider,
        name: 'TestProvider',
        token: 'TestProvider',
      });
      moduleMock.injectables.set('TestProvider', testInjectable);

      loadInjectableStub = vi
        .spyOn(injector, 'loadInjectable')
        .mockImplementation(() => ({}) as any);
      vi.spyOn(injector, 'loadController').mockImplementation(
        () => ({}) as any,
      );

      await loader.createInstancesOfDependencies();
    });

    it('should call "loadInjectable"', async () => {
      expect(loadInjectableStub).toHaveBeenCalledWith(
        moduleMock.injectables.get('TestProvider'),
        moduleMock as any,
      );
    });
    it('should call "inspectInstanceWrapper"', async () => {
      expect(inspectInstanceWrapperStub).toHaveBeenCalledWith(
        moduleMock.injectables.get('TestProvider'),
        moduleMock as any,
      );
    });
  });
});
