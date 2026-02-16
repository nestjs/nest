import { expect } from 'chai';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { ModulesContainer } from '../../injector/modules-container';
import { DiscoverableMetaHostCollection } from '../../discovery/discoverable-meta-host-collection';

describe('DiscoverableMetaHostCollection', () => {
  beforeEach(() => {
    // Clear the metaHostLinks map before each test
    DiscoverableMetaHostCollection.metaHostLinks.clear();
  });

  describe('addClassMetaHostLink', () => {
    it('should add a link between a class reference and a metadata key', () => {
      class TestClass {}
      const metadataKey = 'test-meta-key';

      DiscoverableMetaHostCollection.addClassMetaHostLink(
        TestClass,
        metadataKey,
      );

      expect(DiscoverableMetaHostCollection.metaHostLinks.get(TestClass)).to.eq(
        metadataKey,
      );
    });

    it('should overwrite existing link for the same class', () => {
      class TestClass {}

      DiscoverableMetaHostCollection.addClassMetaHostLink(TestClass, 'key1');
      DiscoverableMetaHostCollection.addClassMetaHostLink(TestClass, 'key2');

      expect(DiscoverableMetaHostCollection.metaHostLinks.get(TestClass)).to.eq(
        'key2',
      );
    });
  });

  describe('insertByMetaKey', () => {
    it('should create a new set when metaKey does not exist in collection', () => {
      const collection = new Map<string, Set<InstanceWrapper>>();
      const instanceWrapper = new InstanceWrapper({
        token: 'TestToken',
        name: 'TestProvider',
      });
      const metaKey = 'test-key';

      DiscoverableMetaHostCollection.insertByMetaKey(
        metaKey,
        instanceWrapper,
        collection,
      );

      expect(collection.has(metaKey)).to.be.true;
      expect(collection.get(metaKey)!.has(instanceWrapper)).to.be.true;
      expect(collection.get(metaKey)!.size).to.eq(1);
    });

    it('should add to existing set when metaKey already exists', () => {
      const collection = new Map<string, Set<InstanceWrapper>>();
      const instanceWrapper1 = new InstanceWrapper({
        token: 'TestToken1',
        name: 'TestProvider1',
      });
      const instanceWrapper2 = new InstanceWrapper({
        token: 'TestToken2',
        name: 'TestProvider2',
      });
      const metaKey = 'test-key';

      DiscoverableMetaHostCollection.insertByMetaKey(
        metaKey,
        instanceWrapper1,
        collection,
      );
      DiscoverableMetaHostCollection.insertByMetaKey(
        metaKey,
        instanceWrapper2,
        collection,
      );

      expect(collection.get(metaKey)!.size).to.eq(2);
      expect(collection.get(metaKey)!.has(instanceWrapper1)).to.be.true;
      expect(collection.get(metaKey)!.has(instanceWrapper2)).to.be.true;
    });
  });

  describe('getProvidersByMetaKey', () => {
    it('should return empty set when hostContainerRef is not registered', () => {
      const hostContainerRef = new ModulesContainer();
      const metaKey = 'test-key';

      const result = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        hostContainerRef,
        metaKey,
      );

      expect(result).to.be.instanceOf(Set);
      expect(result.size).to.eq(0);
    });

    it('should return empty set when metaKey is not found', () => {
      const hostContainerRef = new ModulesContainer();
      class TestClass {}

      // Register a provider with a different metaKey
      DiscoverableMetaHostCollection.addClassMetaHostLink(
        TestClass,
        'other-key',
      );
      const instanceWrapper = new InstanceWrapper({
        token: TestClass,
        name: 'TestProvider',
        metatype: TestClass,
      });
      DiscoverableMetaHostCollection.inspectProvider(
        hostContainerRef,
        instanceWrapper,
      );

      const result = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        hostContainerRef,
        'non-existent-key',
      );

      expect(result).to.be.instanceOf(Set);
      expect(result.size).to.eq(0);
    });

    it('should return providers with matching metaKey', () => {
      const hostContainerRef = new ModulesContainer();
      class TestClass {}
      const metaKey = 'test-key';

      DiscoverableMetaHostCollection.addClassMetaHostLink(TestClass, metaKey);
      const instanceWrapper = new InstanceWrapper({
        token: TestClass,
        name: 'TestProvider',
        metatype: TestClass,
      });
      DiscoverableMetaHostCollection.inspectProvider(
        hostContainerRef,
        instanceWrapper,
      );

      const result = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        hostContainerRef,
        metaKey,
      );

      expect(result.size).to.eq(1);
      expect(result.has(instanceWrapper)).to.be.true;
    });
  });

  describe('getControllersByMetaKey', () => {
    it('should return empty set when hostContainerRef is not registered', () => {
      const hostContainerRef = new ModulesContainer();
      const metaKey = 'test-key';

      const result = DiscoverableMetaHostCollection.getControllersByMetaKey(
        hostContainerRef,
        metaKey,
      );

      expect(result).to.be.instanceOf(Set);
      expect(result.size).to.eq(0);
    });

    it('should return controllers with matching metaKey', () => {
      const hostContainerRef = new ModulesContainer();
      class TestController {}
      const metaKey = 'controller-key';

      DiscoverableMetaHostCollection.addClassMetaHostLink(
        TestController,
        metaKey,
      );
      const instanceWrapper = new InstanceWrapper({
        token: TestController,
        name: 'TestController',
        metatype: TestController,
      });
      DiscoverableMetaHostCollection.inspectController(
        hostContainerRef,
        instanceWrapper,
      );

      const result = DiscoverableMetaHostCollection.getControllersByMetaKey(
        hostContainerRef,
        metaKey,
      );

      expect(result.size).to.eq(1);
      expect(result.has(instanceWrapper)).to.be.true;
    });
  });

  describe('inspectProvider', () => {
    it('should not add provider when no metaKey is linked', () => {
      const hostContainerRef = new ModulesContainer();
      class UnlinkedClass {}

      const instanceWrapper = new InstanceWrapper({
        token: UnlinkedClass,
        name: 'UnlinkedProvider',
        metatype: UnlinkedClass,
      });

      DiscoverableMetaHostCollection.inspectProvider(
        hostContainerRef,
        instanceWrapper,
      );

      const result = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        hostContainerRef,
        'any-key',
      );
      expect(result.size).to.eq(0);
    });

    it('should add provider when metaKey is linked', () => {
      const hostContainerRef = new ModulesContainer();
      class LinkedClass {}
      const metaKey = 'linked-key';

      DiscoverableMetaHostCollection.addClassMetaHostLink(LinkedClass, metaKey);
      const instanceWrapper = new InstanceWrapper({
        token: LinkedClass,
        name: 'LinkedProvider',
        metatype: LinkedClass,
      });

      DiscoverableMetaHostCollection.inspectProvider(
        hostContainerRef,
        instanceWrapper,
      );

      const result = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        hostContainerRef,
        metaKey,
      );
      expect(result.size).to.eq(1);
      expect(result.has(instanceWrapper)).to.be.true;
    });

    it('should not add provider when metatype is null and inject is not provided (useValue without inject)', () => {
      const hostContainerRef = new ModulesContainer();
      class ValueClass {}
      const metaKey = 'value-key';

      DiscoverableMetaHostCollection.addClassMetaHostLink(ValueClass, metaKey);
      const instance = new ValueClass();
      const instanceWrapper = new InstanceWrapper({
        token: 'VALUE_TOKEN',
        name: 'ValueProvider',
        metatype: null as any,
        instance,
      });

      DiscoverableMetaHostCollection.inspectProvider(
        hostContainerRef,
        instanceWrapper,
      );

      // When metatype is null and inject is not provided, the provider cannot be resolved
      // because the code uses `metatype || inject` condition for performance optimization
      const result = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        hostContainerRef,
        metaKey,
      );
      expect(result.size).to.eq(0);
    });

    it('should use instance constructor when metatype is null but inject is provided', () => {
      const hostContainerRef = new ModulesContainer();
      class ValueClass {}
      const metaKey = 'value-key';

      DiscoverableMetaHostCollection.addClassMetaHostLink(ValueClass, metaKey);
      const instance = new ValueClass();
      const instanceWrapper = new InstanceWrapper({
        token: 'VALUE_TOKEN',
        name: 'ValueProvider',
        metatype: null as any,
        inject: [], // Providing inject (even empty) makes the condition truthy
        instance,
      });

      DiscoverableMetaHostCollection.inspectProvider(
        hostContainerRef,
        instanceWrapper,
      );

      const result = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        hostContainerRef,
        metaKey,
      );
      expect(result.size).to.eq(1);
    });

    it('should use instance constructor when inject is provided (useFactory)', () => {
      const hostContainerRef = new ModulesContainer();
      class FactoryResultClass {}
      const metaKey = 'factory-key';

      DiscoverableMetaHostCollection.addClassMetaHostLink(
        FactoryResultClass,
        metaKey,
      );
      const instance = new FactoryResultClass();
      const instanceWrapper = new InstanceWrapper({
        token: 'FACTORY_TOKEN',
        name: 'FactoryProvider',
        metatype: () => instance,
        inject: ['DEP1', 'DEP2'],
        instance,
      });

      DiscoverableMetaHostCollection.inspectProvider(
        hostContainerRef,
        instanceWrapper,
      );

      const result = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        hostContainerRef,
        metaKey,
      );
      expect(result.size).to.eq(1);
    });
  });

  describe('inspectController', () => {
    it('should not add controller when no metaKey is linked', () => {
      const hostContainerRef = new ModulesContainer();
      class UnlinkedController {}

      const instanceWrapper = new InstanceWrapper({
        token: UnlinkedController,
        name: 'UnlinkedController',
        metatype: UnlinkedController,
      });

      DiscoverableMetaHostCollection.inspectController(
        hostContainerRef,
        instanceWrapper,
      );

      const result = DiscoverableMetaHostCollection.getControllersByMetaKey(
        hostContainerRef,
        'any-key',
      );
      expect(result.size).to.eq(0);
    });

    it('should add controller when metaKey is linked', () => {
      const hostContainerRef = new ModulesContainer();
      class LinkedController {}
      const metaKey = 'linked-controller-key';

      DiscoverableMetaHostCollection.addClassMetaHostLink(
        LinkedController,
        metaKey,
      );
      const instanceWrapper = new InstanceWrapper({
        token: LinkedController,
        name: 'LinkedController',
        metatype: LinkedController,
      });

      DiscoverableMetaHostCollection.inspectController(
        hostContainerRef,
        instanceWrapper,
      );

      const result = DiscoverableMetaHostCollection.getControllersByMetaKey(
        hostContainerRef,
        metaKey,
      );
      expect(result.size).to.eq(1);
      expect(result.has(instanceWrapper)).to.be.true;
    });
  });

  describe('inspectInstanceWrapper with existing collection', () => {
    it('should add to existing collection when hostContainerRef is already registered', () => {
      const hostContainerRef = new ModulesContainer();
      class TestClass1 {}
      class TestClass2 {}
      const metaKey = 'shared-key';

      DiscoverableMetaHostCollection.addClassMetaHostLink(TestClass1, metaKey);
      DiscoverableMetaHostCollection.addClassMetaHostLink(TestClass2, metaKey);

      const instanceWrapper1 = new InstanceWrapper({
        token: TestClass1,
        name: 'TestProvider1',
        metatype: TestClass1,
      });
      const instanceWrapper2 = new InstanceWrapper({
        token: TestClass2,
        name: 'TestProvider2',
        metatype: TestClass2,
      });

      DiscoverableMetaHostCollection.inspectProvider(
        hostContainerRef,
        instanceWrapper1,
      );
      DiscoverableMetaHostCollection.inspectProvider(
        hostContainerRef,
        instanceWrapper2,
      );

      const result = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        hostContainerRef,
        metaKey,
      );
      expect(result.size).to.eq(2);
      expect(result.has(instanceWrapper1)).to.be.true;
      expect(result.has(instanceWrapper2)).to.be.true;
    });
  });
});
