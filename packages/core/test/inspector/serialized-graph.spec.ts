import { Scope } from '@nestjs/common';
import { ApplicationConfig } from '../../application-config.js';
import { Edge } from '../../inspector/interfaces/edge.interface.js';
import { Node } from '../../inspector/interfaces/node.interface.js';
import { SerializedGraph } from '../../inspector/serialized-graph.js';

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

        expect(nodesCollection.get(nodeDefinition.id)).toEqual({
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

        expect(nodesCollection.get(nodeDefinition.id)).toBe(nodeDefinition);
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

        expect(edgesCollection.get(edge.id)).toEqual({
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

        expect(edgesCollection.get(edge.id)).toEqual({
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
      expect(serializedGraph.getNodeById(nodeDefinition.id)).toBe(
        nodeDefinition,
      );
    });

    it('should return undefined for non-existent id', () => {
      expect(serializedGraph.getNodeById('non-existent')).toBeUndefined();
    });
  });

  describe('insertNode (duplicate)', () => {
    it('should return the existing node when the same id is inserted twice', () => {
      class AppService {}

      const nodeDefinition = {
        id: 'duplicate-id',
        label: 'AppService',
        parent: 'parent-id',
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

      const first = serializedGraph.insertNode(nodeDefinition);
      const second = serializedGraph.insertNode({
        ...nodeDefinition,
        label: 'DifferentLabel',
      });

      // Should return the original, not the new one
      expect(second).toBe(first);
      expect(nodesCollection.get('duplicate-id')!.label).toBe('AppService');
    });
  });

  describe('insertEntrypoint', () => {
    it('should create a new entrypoint collection for a parent id', () => {
      const entrypoint = {
        type: 'http-endpoint',
        methodName: 'findAll',
        className: 'UsersController',
        classNodeId: 'node-1',
      };
      serializedGraph.insertEntrypoint(entrypoint as any, 'parent-1');

      const json = serializedGraph.toJSON();
      expect(json.entrypoints['parent-1']).toHaveLength(1);
      expect(json.entrypoints['parent-1'][0]).toBe(entrypoint);
    });

    it('should append to existing collection for the same parent id', () => {
      const ep1 = { type: 'http', methodName: 'findAll' };
      const ep2 = { type: 'http', methodName: 'findOne' };

      serializedGraph.insertEntrypoint(ep1 as any, 'parent-1');
      serializedGraph.insertEntrypoint(ep2 as any, 'parent-1');

      const json = serializedGraph.toJSON();
      expect(json.entrypoints['parent-1']).toHaveLength(2);
    });
  });

  describe('insertOrphanedEnhancer', () => {
    it('should add an orphaned enhancer entry', () => {
      const entry = { subtype: 'guard', ref: 'AuthGuard' };
      serializedGraph.insertOrphanedEnhancer(entry as any);

      const json = serializedGraph.toJSON();
      expect(json.extras.orphanedEnhancers).toContainEqual(entry);
    });
  });

  describe('insertAttachedEnhancer', () => {
    it('should add an attached enhancer with the given nodeId', () => {
      serializedGraph.insertAttachedEnhancer('node-123');

      const json = serializedGraph.toJSON();
      expect(json.extras.attachedEnhancers).toContainEqual({
        nodeId: 'node-123',
      });
    });
  });

  describe('status and metadata setters', () => {
    it('should include status in JSON output', () => {
      serializedGraph.status = 'partial';

      const json = serializedGraph.toJSON();
      expect(json['status']).toBe('partial');
    });

    it('should default status to complete', () => {
      const json = serializedGraph.toJSON();
      expect(json['status']).toBe('complete');
    });

    it('should include metadata in JSON output', () => {
      const metadata = { key: 'value' };
      serializedGraph.metadata = metadata as any;

      const json = serializedGraph.toJSON();
      expect(json['metadata']).toBe(metadata);
    });
  });

  describe('toJSON', () => {
    it('should return a JSON representation with all collections', () => {
      const json = serializedGraph.toJSON();

      expect(json).toHaveProperty('nodes');
      expect(json).toHaveProperty('edges');
      expect(json).toHaveProperty('entrypoints');
      expect(json).toHaveProperty('extras');
    });
  });

  describe('toString', () => {
    it('should return a JSON string representation', () => {
      const result = serializedGraph.toString();
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should convert symbol values to strings', () => {
      const sym = Symbol('testSymbol');
      const nodeDefinition = {
        id: 'sym-node',
        label: 'SymNode',
        parent: 'parent',
        metadata: {
          type: 'provider' as const,
          sourceModuleName: 'AppModule',
          durable: false,
          static: true,
          transient: false,
          token: sym as any,
          scope: Scope.DEFAULT,
          exported: false,
          initTime: 0,
        },
      };
      serializedGraph.insertNode(nodeDefinition);

      const result = serializedGraph.toString();
      expect(result).toContain('Symbol(testSymbol)');
    });

    it('should convert function values to their names', () => {
      function MyService() {}
      const nodeDefinition = {
        id: 'fn-node',
        label: 'FnNode',
        parent: 'parent',
        metadata: {
          type: 'provider' as const,
          sourceModuleName: 'AppModule',
          durable: false,
          static: true,
          transient: false,
          token: MyService,
          scope: Scope.DEFAULT,
          exported: false,
          initTime: 0,
        },
      };
      serializedGraph.insertNode(nodeDefinition);

      const result = serializedGraph.toString();
      expect(result).toContain('MyService');
    });
  });
});
