import { Scope } from '@nestjs/common';
import { expect } from 'chai';
import { ApplicationConfig } from '../../application-config';
import { Edge } from '../../inspector/interfaces/edge.interface';
import { Node } from '../../inspector/interfaces/node.interface';
import { SerializedGraph } from '../../inspector/serialized-graph';

describe('SerializedGraph', () => {
  let serializedGraph: SerializedGraph;
  let nodesCollection: Map<string, Node>;
  let edgesCollection: Map<string, Edge>;

  beforeEach(() => {
    serializedGraph = new SerializedGraph();
    nodesCollection = serializedGraph['nodes'];
    edgesCollection = serializedGraph['edges'];
  });

  describe('insertNode', () => {
    describe('when node definition represents an internal provider', () => {
      it('should insert a node with the expected schema (internal: true)', () => {
        const nodeDefinition = {
          id: '11430093-e992-4ae6-8ba4-c7db80419de8',
          label: 'ApplicationConfig',
          parent: '2c989d11-2731-4828-a2eb-c86d10c73621',
          metadata: {
            type: 'provider' as const,
            sourceModuleName: 'AppModule',
            durable: false,
            static: true,
            transient: false,
            token: ApplicationConfig,
            scope: Scope.DEFAULT,
            exported: false,
            initTime: 100,
          },
        };
        serializedGraph.insertNode(nodeDefinition);

        expect(nodesCollection.get(nodeDefinition.id)).to.deep.equal({
          ...nodeDefinition,
          metadata: {
            ...nodeDefinition.metadata,
            internal: true,
          },
        });
      });
    });
    describe('otherwise', () => {
      it('should insert a node with the expected schema', () => {
        class AppService {}

        const nodeDefinition = {
          id: '11430093-e992-4ae6-8ba4-c7db80419de8',
          label: 'AppService',
          parent: '2c989d11-2731-4828-a2eb-c86d10c73621',
          metadata: {
            type: 'provider' as const,
            sourceModuleName: 'AppModule',
            durable: false,
            static: true,
            transient: false,
            token: AppService,
            scope: Scope.DEFAULT,
            exported: false,
            initTime: 100,
          },
        };
        serializedGraph.insertNode(nodeDefinition);

        expect(nodesCollection.get(nodeDefinition.id)).to.equal(nodeDefinition);
      });
    });
  });

  describe('insertEdge', () => {
    describe('when edge definition represents internal providers connection', () => {
      it('should insert an edge with the expected schema (internal: true)', () => {
        const edgeDefinition = {
          source: '8920252f-4e7d-4f9e-9eeb-71da467a35cc',
          target: 'c97bc04d-cfcf-41b1-96ec-db729f33676e',
          metadata: {
            type: 'class-to-class' as const,
            sourceModuleName: 'UtilsExceptionsModule',
            sourceClassName: 'AllExceptionsFilter',
            targetClassName: 'HttpAdapterHost',
            sourceClassToken:
              'APP_FILTER (UUID: 4187828c-5c76-4aed-a29f-a6eb40054b9d)',
            targetClassToken: 'HttpAdapterHost',
            targetModuleName: 'InternalCoreModule',
            keyOrIndex: 0,
            injectionType: 'constructor' as const,
          },
        };
        const edge = serializedGraph.insertEdge(edgeDefinition);

        expect(edgesCollection.get(edge.id)).to.deep.equal({
          ...edgeDefinition,
          metadata: {
            ...edgeDefinition.metadata,
            internal: true,
          },
          id: edge.id,
        });
      });
    });
    describe('otherwise', () => {
      it('should insert an edge with the expected schema', () => {
        const edgeDefinition = {
          source: '8920252f-4e7d-4f9e-9eeb-71da467a35cc',
          target: 'c97bc04d-cfcf-41b1-96ec-db729f33676e',
          metadata: {
            type: 'class-to-class' as const,
            sourceModuleName: 'UtilsExceptionsModule',
            sourceClassName: 'AllExceptionsFilter',
            targetClassName: 'AppService',
            sourceClassToken:
              'APP_FILTER (UUID: 4187828c-5c76-4aed-a29f-a6eb40054b9d)',
            targetClassToken: 'AppService',
            targetModuleName: 'InternalCoreModule',
            keyOrIndex: 0,
            injectionType: 'constructor' as const,
          },
        };
        const edge = serializedGraph.insertEdge(edgeDefinition);

        expect(edgesCollection.get(edge.id)).to.deep.equal({
          ...edgeDefinition,
          id: edge.id,
        });
      });
    });
  });

  describe('getNodeById', () => {
    it('should return a given node', () => {
      const nodeDefinition = {
        id: '11430093-e992-4ae6-8ba4-c7db80419de8',
        label: 'AppService',
        parent: '2c989d11-2731-4828-a2eb-c86d10c73621',
        metadata: {
          type: 'provider' as const,
          sourceModuleName: 'AppModule',
          durable: false,
          static: true,
          transient: false,
          scope: Scope.DEFAULT,
          token: 'AppService',
          exported: true,
          initTime: 100,
        },
      };

      nodesCollection.set(nodeDefinition.id, nodeDefinition);
      expect(serializedGraph.getNodeById(nodeDefinition.id)).to.eq(
        nodeDefinition,
      );
    });
  });
});
