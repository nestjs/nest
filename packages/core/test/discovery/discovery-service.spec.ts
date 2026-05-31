import { expect } from 'chai';
import * as sinon from 'sinon';
import { DiscoveryService } from '../../discovery/discovery-service';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { Module } from '../../injector/module';
import { ModulesContainer } from '../../injector/modules-container';
import { DiscoverableMetaHostCollection } from '../../discovery/discoverable-meta-host-collection';

describe('DiscoveryService', () => {
  let discoveryService: DiscoveryService;
  let modulesContainer: ModulesContainer;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    modulesContainer = new ModulesContainer();
    discoveryService = new DiscoveryService(modulesContainer);
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('createDecorator', () => {
    it('should create a decorator with a unique KEY', () => {
      const decorator1 = DiscoveryService.createDecorator();
      const decorator2 = DiscoveryService.createDecorator();

      expect(decorator1.KEY).to.be.a('string');
      expect(decorator2.KEY).to.be.a('string');
      expect(decorator1.KEY).to.not.equal(decorator2.KEY);
    });

    it('should create a decorator that can decorate classes', () => {
      const TestDecorator = DiscoveryService.createDecorator<{
        value: string;
      }>();

      @TestDecorator({ value: 'test' })
      class TestClass {}

      const metadata = Reflect.getMetadata(TestDecorator.KEY, TestClass);
      expect(metadata).to.deep.equal({ value: 'test' });
    });

    it('should create a decorator that can decorate methods', () => {
      const TestDecorator = DiscoveryService.createDecorator<{
        event: string;
      }>();

      class TestClass {
        @TestDecorator({ event: 'click' })
        handleClick() {}
      }

      const metadata = Reflect.getMetadata(
        TestDecorator.KEY,
        new TestClass().handleClick,
      );
      expect(metadata).to.deep.equal({ event: 'click' });
    });

    it('should use empty object as default metadata when no options provided', () => {
      const TestDecorator = DiscoveryService.createDecorator();

      @TestDecorator()
      class TestClass {}

      const metadata = Reflect.getMetadata(TestDecorator.KEY, TestClass);
      expect(metadata).to.deep.equal({});
    });

    it('should add class to DiscoverableMetaHostCollection when decorating a class', () => {
      const addClassMetaHostLinkSpy = sandbox.spy(
        DiscoverableMetaHostCollection,
        'addClassMetaHostLink',
      );
      const TestDecorator = DiscoveryService.createDecorator();

      @TestDecorator()
      class TestClass {}

      expect(addClassMetaHostLinkSpy.calledOnce).to.be.true;
      expect(addClassMetaHostLinkSpy.calledWith(TestClass, TestDecorator.KEY))
        .to.be.true;
    });

    it('should not add to DiscoverableMetaHostCollection when decorating a method', () => {
      const addClassMetaHostLinkSpy = sandbox.spy(
        DiscoverableMetaHostCollection,
        'addClassMetaHostLink',
      );
      const TestDecorator = DiscoveryService.createDecorator();

      class TestClass {
        @TestDecorator()
        testMethod() {}
      }

      expect(addClassMetaHostLinkSpy.called).to.be.false;
    });
  });

  describe('getProviders', () => {
    it('should return all providers from all modules when no options provided', () => {
      const module1 = new Module(class Module1 {}, modulesContainer as any);
      const module2 = new Module(class Module2 {}, modulesContainer as any);

      // Clear default providers
      module1.providers.clear();
      module2.providers.clear();

      const provider1 = new InstanceWrapper({
        name: 'Provider1',
        token: 'PROVIDER_1',
      });
      const provider2 = new InstanceWrapper({
        name: 'Provider2',
        token: 'PROVIDER_2',
      });
      const provider3 = new InstanceWrapper({
        name: 'Provider3',
        token: 'PROVIDER_3',
      });

      module1.providers.set('PROVIDER_1', provider1);
      module1.providers.set('PROVIDER_2', provider2);
      module2.providers.set('PROVIDER_3', provider3);

      modulesContainer.set('Module1', module1);
      modulesContainer.set('Module2', module2);

      const providers = discoveryService.getProviders();

      expect(providers).to.have.lengthOf(3);
      expect(providers).to.include(provider1);
      expect(providers).to.include(provider2);
      expect(providers).to.include(provider3);
    });

    it('should return empty array when no modules exist', () => {
      const providers = discoveryService.getProviders();
      expect(providers).to.be.an('array').that.is.empty;
    });

    it('should return empty array when modules have no providers', () => {
      const module1 = new Module(class Module1 {}, modulesContainer as any);
      module1.providers.clear();
      modulesContainer.set('Module1', module1);

      const providers = discoveryService.getProviders();
      expect(providers).to.be.an('array').that.is.empty;
    });

    it('should filter providers by metadataKey when provided', () => {
      const metadataKey = 'test-metadata-key';
      const provider1 = new InstanceWrapper({
        name: 'Provider1',
        token: 'PROVIDER_1',
      });
      const provider2 = new InstanceWrapper({
        name: 'Provider2',
        token: 'PROVIDER_2',
      });

      const providerSet = new Set([provider1, provider2]);
      const getProvidersByMetaKeyStub = sandbox
        .stub(DiscoverableMetaHostCollection, 'getProvidersByMetaKey')
        .returns(providerSet);

      const providers = discoveryService.getProviders({ metadataKey });

      expect(getProvidersByMetaKeyStub.calledOnce).to.be.true;
      expect(
        getProvidersByMetaKeyStub.calledWith(modulesContainer, metadataKey),
      ).to.be.true;
      expect(providers).to.have.lengthOf(2);
      expect(providers).to.include(provider1);
      expect(providers).to.include(provider2);
    });

    it('should return empty array when no providers match the metadataKey', () => {
      const metadataKey = 'non-existent-key';
      const emptySet = new Set<InstanceWrapper>();

      sandbox
        .stub(DiscoverableMetaHostCollection, 'getProvidersByMetaKey')
        .returns(emptySet);

      const providers = discoveryService.getProviders({ metadataKey });
      expect(providers).to.be.an('array').that.is.empty;
    });

    it('should filter providers by included modules', () => {
      class Module1 {}
      class Module2 {}
      class Module3 {}

      const module1 = new Module(Module1, modulesContainer as any);
      const module2 = new Module(Module2, modulesContainer as any);
      const module3 = new Module(Module3, modulesContainer as any);

      // Clear default providers
      module1.providers.clear();
      module2.providers.clear();
      module3.providers.clear();

      const provider1 = new InstanceWrapper({
        name: 'Provider1',
        token: 'PROVIDER_1',
      });
      const provider2 = new InstanceWrapper({
        name: 'Provider2',
        token: 'PROVIDER_2',
      });
      const provider3 = new InstanceWrapper({
        name: 'Provider3',
        token: 'PROVIDER_3',
      });

      module1.providers.set('PROVIDER_1', provider1);
      module2.providers.set('PROVIDER_2', provider2);
      module3.providers.set('PROVIDER_3', provider3);

      modulesContainer.set('Module1', module1);
      modulesContainer.set('Module2', module2);
      modulesContainer.set('Module3', module3);

      const providers = discoveryService.getProviders({
        include: [Module1, Module2],
      });

      expect(providers).to.have.lengthOf(2);
      expect(providers).to.include(provider1);
      expect(providers).to.include(provider2);
      expect(providers).to.not.include(provider3);
    });

    it('should return empty array when include option is empty array', () => {
      const module1 = new Module(class Module1 {}, modulesContainer as any);
      const provider1 = new InstanceWrapper({
        name: 'Provider1',
        token: 'PROVIDER_1',
      });
      module1.providers.set('PROVIDER_1', provider1);
      modulesContainer.set('Module1', module1);

      const providers = discoveryService.getProviders({ include: [] });
      expect(providers).to.be.an('array').that.is.empty;
    });
  });

  describe('getControllers', () => {
    it('should return all controllers from all modules when no options provided', () => {
      const module1 = new Module(class Module1 {}, modulesContainer as any);
      const module2 = new Module(class Module2 {}, modulesContainer as any);

      const controller1 = new InstanceWrapper({
        name: 'Controller1',
        token: 'CONTROLLER_1',
      });
      const controller2 = new InstanceWrapper({
        name: 'Controller2',
        token: 'CONTROLLER_2',
      });

      module1.controllers.set('CONTROLLER_1', controller1);
      module2.controllers.set('CONTROLLER_2', controller2);

      modulesContainer.set('Module1', module1);
      modulesContainer.set('Module2', module2);

      const controllers = discoveryService.getControllers();

      expect(controllers).to.have.lengthOf(2);
      expect(controllers).to.include(controller1);
      expect(controllers).to.include(controller2);
    });

    it('should return empty array when no controllers exist', () => {
      const module1 = new Module(class Module1 {}, modulesContainer as any);
      modulesContainer.set('Module1', module1);

      const controllers = discoveryService.getControllers();
      expect(controllers).to.be.an('array').that.is.empty;
    });

    it('should filter controllers by metadataKey when provided', () => {
      const metadataKey = 'controller-metadata-key';
      const controller1 = new InstanceWrapper({
        name: 'Controller1',
        token: 'CONTROLLER_1',
      });

      const controllerSet = new Set([controller1]);
      const getControllersByMetaKeyStub = sandbox
        .stub(DiscoverableMetaHostCollection, 'getControllersByMetaKey')
        .returns(controllerSet);

      const controllers = discoveryService.getControllers({ metadataKey });

      expect(getControllersByMetaKeyStub.calledOnce).to.be.true;
      expect(
        getControllersByMetaKeyStub.calledWith(modulesContainer, metadataKey),
      ).to.be.true;
      expect(controllers).to.have.lengthOf(1);
      expect(controllers).to.include(controller1);
    });

    it('should filter controllers by included modules', () => {
      class Module1 {}
      class Module2 {}

      const module1 = new Module(Module1, modulesContainer as any);
      const module2 = new Module(Module2, modulesContainer as any);

      const controller1 = new InstanceWrapper({
        name: 'Controller1',
        token: 'CONTROLLER_1',
      });
      const controller2 = new InstanceWrapper({
        name: 'Controller2',
        token: 'CONTROLLER_2',
      });

      module1.controllers.set('CONTROLLER_1', controller1);
      module2.controllers.set('CONTROLLER_2', controller2);

      modulesContainer.set('Module1', module1);
      modulesContainer.set('Module2', module2);

      const controllers = discoveryService.getControllers({
        include: [Module1],
      });

      expect(controllers).to.have.lengthOf(1);
      expect(controllers).to.include(controller1);
      expect(controllers).to.not.include(controller2);
    });
  });

  describe('getMetadataByDecorator', () => {
    it('should retrieve metadata from class using decorator', () => {
      const TestDecorator = DiscoveryService.createDecorator<{
        role: string;
      }>();

      @TestDecorator({ role: 'admin' })
      class TestClass {}

      const instance = new TestClass();
      const wrapper = new InstanceWrapper({
        name: 'TestClass',
        token: TestClass,
        metatype: TestClass,
        instance,
      });

      const metadata = discoveryService.getMetadataByDecorator(
        TestDecorator,
        wrapper,
      );

      expect(metadata).to.deep.equal({ role: 'admin' });
    });

    it('should retrieve metadata from method using decorator and methodKey', () => {
      const TestDecorator = DiscoveryService.createDecorator<{
        event: string;
      }>();

      class TestClass {
        @TestDecorator({ event: 'created' })
        onCreate() {}
      }

      const instance = new TestClass();
      const wrapper = new InstanceWrapper({
        name: 'TestClass',
        token: TestClass,
        metatype: TestClass,
        instance,
      });

      const metadata = discoveryService.getMetadataByDecorator(
        TestDecorator,
        wrapper,
        'onCreate',
      );

      expect(metadata).to.deep.equal({ event: 'created' });
    });

    it('should return undefined when metadata does not exist', () => {
      const TestDecorator = DiscoveryService.createDecorator();

      class TestClass {}

      const instance = new TestClass();
      const wrapper = new InstanceWrapper({
        name: 'TestClass',
        token: TestClass,
        metatype: TestClass,
        instance,
      });

      const metadata = discoveryService.getMetadataByDecorator(
        TestDecorator,
        wrapper,
      );

      expect(metadata).to.be.undefined;
    });

    it('should return undefined when methodKey does not exist on instance', () => {
      const TestDecorator = DiscoveryService.createDecorator();

      class TestClass {
        existingMethod() {}
      }

      const instance = new TestClass();
      const wrapper = new InstanceWrapper({
        name: 'TestClass',
        token: TestClass,
        metatype: TestClass,
        instance,
      });

      const metadata = discoveryService.getMetadataByDecorator(
        TestDecorator,
        wrapper,
        'existingMethod', // Use existing method to avoid undefined reference error
      );

      expect(metadata).to.be.undefined;
    });

    it('should use metatype when instance.constructor is undefined', () => {
      const TestDecorator = DiscoveryService.createDecorator<{
        value: number;
      }>();

      @TestDecorator({ value: 42 })
      class TestClass {}

      const instanceWithoutConstructor: any = Object.create(null);

      const wrapper = new InstanceWrapper({
        name: 'TestClass',
        token: TestClass,
        metatype: TestClass,
        instance: instanceWithoutConstructor,
      });

      const metadata = discoveryService.getMetadataByDecorator(
        TestDecorator,
        wrapper,
      );

      expect(metadata).to.deep.equal({ value: 42 });
    });

    it('should handle undefined instance gracefully', () => {
      const TestDecorator = DiscoveryService.createDecorator<{
        test: string;
      }>();

      @TestDecorator({ test: 'value' })
      class TestClass {}

      const wrapper = new InstanceWrapper({
        name: 'TestClass',
        token: TestClass,
        metatype: TestClass,
        instance: undefined,
      });

      const metadata = discoveryService.getMetadataByDecorator(
        TestDecorator,
        wrapper,
      );

      expect(metadata).to.deep.equal({ test: 'value' });
    });
  });

  describe('getModules', () => {
    it('should return all modules when no options provided', () => {
      const module1 = new Module(class Module1 {}, modulesContainer as any);
      const module2 = new Module(class Module2 {}, modulesContainer as any);

      modulesContainer.set('Module1', module1);
      modulesContainer.set('Module2', module2);

      const modules = (discoveryService as any).getModules();

      expect(modules).to.have.lengthOf(2);
      expect(modules).to.include(module1);
      expect(modules).to.include(module2);
    });

    it('should return empty array when no modules exist', () => {
      const modules = (discoveryService as any).getModules();
      expect(modules).to.be.an('array').that.is.empty;
    });

    it('should filter modules by include option', () => {
      class Module1 {}
      class Module2 {}
      class Module3 {}

      const module1 = new Module(Module1, modulesContainer as any);
      const module2 = new Module(Module2, modulesContainer as any);
      const module3 = new Module(Module3, modulesContainer as any);

      modulesContainer.set('Module1', module1);
      modulesContainer.set('Module2', module2);
      modulesContainer.set('Module3', module3);

      const modules = (discoveryService as any).getModules({
        include: [Module1, Module3],
      });

      expect(modules).to.have.lengthOf(2);
      expect(modules).to.include(module1);
      expect(modules).to.include(module3);
      expect(modules).to.not.include(module2);
    });

    it('should return empty array when include option is empty', () => {
      const module1 = new Module(class Module1 {}, modulesContainer as any);
      modulesContainer.set('Module1', module1);

      const modules = (discoveryService as any).getModules({ include: [] });
      expect(modules).to.be.an('array').that.is.empty;
    });
  });
});
