import { Scope } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { NestContainer } from '../../injector/container';
import { InstanceWrapper } from '../../injector/instance-wrapper';
import { Module } from '../../injector/module';
import { GraphInspector } from '../../inspector/graph-inspector';
import { EnhancerMetadataCacheEntry } from '../../inspector/interfaces/enhancer-metadata-cache-entry.interface';
import { SerializedGraph } from '../../inspector/serialized-graph';

describe('GraphInspector', () => {
  let graphInspector: GraphInspector;
  let enhancersMetadataCache: Array<EnhancerMetadataCacheEntry>;
  let graph: SerializedGraph;
  let container: NestContainer;

  beforeEach(() => {
    container = new NestContainer();
    graphInspector = new GraphInspector(container);

    enhancersMetadataCache = graphInspector['enhancersMetadataCache'];
    graph = graphInspector['graph'];
  });

  describe('insertEnhancerMetadataCache', () => {
    it('should insert an enhancer metadata cache entry', () => {
      const entry = {
        moduleToken: 'moduleToken',
        classRef: class AppService {},
        methodKey: undefined,
        subtype: 'guard' as const,
      };
      graphInspector.insertEnhancerMetadataCache(entry);
      expect(enhancersMetadataCache).includes(entry);
    });
  });

  describe('inspectInstanceWrapper', () => {
    class AppService {}

    it('should inspect given instance wrapper and insert appropriate edges', () => {
      const moduleRef = new Module(class TestModule {}, container);
      const instanceWrapper = new InstanceWrapper({
        token: AppService,
        name: AppService.name,
        metatype: AppService,
      });

      const param1 = new InstanceWrapper({
        token: 'PARAM_1',
        metatype: class A {},
        host: new Module(class AModule {}, container),
      });
      const param2 = new InstanceWrapper({
        token: 'PARAM_2',
        metatype: class B {},
        host: new Module(class BModule {}, container),
      });
      const dependency = new InstanceWrapper({
        name: 'PROPERTY',
        token: 'PROPERTY',
        metatype: class C {},
        host: new Module(class CModule {}, container),
      });

      instanceWrapper.addCtorMetadata(0, param1);
      instanceWrapper.addCtorMetadata(1, param2);
      instanceWrapper.addCtorMetadata(2, dependency);

      graphInspector.inspectInstanceWrapper(instanceWrapper, moduleRef);

      const edgesArr = [...graph['edges'].values()];
      expect(edgesArr).to.deep.equal([
        {
          id: edgesArr[0].id,
          metadata: {
            injectionType: 'constructor',
            keyOrIndex: 0,
            sourceClassName: instanceWrapper.metatype!.name,
            sourceClassToken: instanceWrapper.token,
            sourceModuleName: 'TestModule',
            targetClassName: param1.name,
            targetClassToken: 'PARAM_1',
            targetModuleName: 'AModule',
            type: 'class-to-class',
          },
          source: instanceWrapper.id,
          target: param1.id,
        },
        {
          id: edgesArr[1].id,
          metadata: {
            injectionType: 'constructor',
            keyOrIndex: 1,
            sourceClassName: instanceWrapper.metatype!.name,
            sourceClassToken: instanceWrapper.token,
            sourceModuleName: 'TestModule',
            targetClassName: param2.name,
            targetClassToken: 'PARAM_2',
            targetModuleName: 'BModule',
            type: 'class-to-class',
          },
          source: instanceWrapper.id,
          target: param2.id,
        },
        {
          id: edgesArr[2].id,
          metadata: {
            injectionType: 'constructor',
            keyOrIndex: 2,
            sourceClassName: 'AppService',
            sourceClassToken: AppService,
            sourceModuleName: 'TestModule',
            targetClassName: dependency.name,
            targetClassToken: 'PROPERTY',
            targetModuleName: 'CModule',
            type: 'class-to-class',
          },
          source: instanceWrapper.id,
          target: dependency.id,
        },
      ]);
    });
  });

  describe('inspectModules', () => {
    class TestModule {}
    class AController {}
    class RandomPipe {}

    it('should inspect all modules', async () => {
      const { moduleRef } = (await container.addModule(TestModule, []))!;
      moduleRef.addController(AController);

      const subtype = 'interceptor';
      const enhancerInstanceWrapper = moduleRef.addInjectable(
        class Enhancer {},
        subtype,
      ) as InstanceWrapper;

      const methodKey = 'findOne';
      enhancersMetadataCache.push(
        {
          moduleToken: moduleRef.token,
          classRef: AController,
          enhancerRef: new RandomPipe(),
          methodKey,
          subtype,
        },
        {
          moduleToken: moduleRef.token,
          classRef: AController,
          enhancerRef: function test() {},
          methodKey,
          subtype,
        },
        {
          moduleToken: moduleRef.token,
          classRef: AController,
          enhancerInstanceWrapper,
          methodKey: undefined,
          subtype,
        },
      );

      const serializedNode = { metadata: {} };
      sinon.stub(graph, 'getNodeById').callsFake(() => serializedNode as any);

      graphInspector.inspectModules();

      expect(serializedNode).to.deep.equal({
        metadata: {
          enhancers: [
            { methodKey, name: RandomPipe.name, subtype },
            { methodKey, name: 'Function', subtype },
            { methodKey: undefined, id: enhancerInstanceWrapper.id, subtype },
          ],
        },
      });
    });
  });

  describe('insertAttachedEnhancer', () => {
    it('should upsert existing node (update metadata) and add node to "attachedEnhancers" array', () => {
      const instanceWrapper = new InstanceWrapper({
        metatype: class A {},
        token: 'A',
      });

      const nodeDefinition = {
        id: instanceWrapper.id,
        label: 'A',
        parent: '2c989d11-2731-4828-a2eb-c86d10c73621',
        metadata: {
          type: 'provider' as const,
          sourceModuleName: 'AppModule',
          durable: false,
          static: true,
          scope: Scope.DEFAULT,
          transient: false,
          token: class A {},
          exported: false,
          initTime: 100,
        },
      };
      const insertedNode = graph.insertNode(nodeDefinition)!;

      graphInspector.insertAttachedEnhancer(instanceWrapper);

      expect(insertedNode.metadata).to.deep.equal({
        ...nodeDefinition.metadata,
        global: true,
      });
      expect(graph['extras'].attachedEnhancers).to.deep.contain({
        nodeId: insertedNode.id,
      });
    });
  });
});
