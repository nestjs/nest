import { PartialGraphHost } from '../../inspector/partial-graph.host.js';
import { SerializedGraph } from '../../inspector/serialized-graph.js';

describe('PartialGraphHost', () => {
  afterEach(() => {
    // Reset the private static
    (PartialGraphHost as any).partialGraph = undefined;
  });

  describe('register', () => {
    it('should store the graph for later retrieval', () => {
      const graph = new SerializedGraph();
      PartialGraphHost.register(graph);

      expect(PartialGraphHost.toJSON()).toBeDefined();
    });
  });

  describe('toJSON', () => {
    it('should return undefined when no graph is registered', () => {
      expect(PartialGraphHost.toJSON()).toBeUndefined();
    });

    it('should delegate to the registered graph', () => {
      const graph = new SerializedGraph();
      const spy = vi.spyOn(graph, 'toJSON');
      PartialGraphHost.register(graph);

      PartialGraphHost.toJSON();

      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe('toString', () => {
    it('should return undefined when no graph is registered', () => {
      expect(PartialGraphHost.toString()).toBeUndefined();
    });

    it('should delegate to the registered graph', () => {
      const graph = new SerializedGraph();
      const spy = vi.spyOn(graph, 'toString');
      PartialGraphHost.register(graph);

      PartialGraphHost.toString();

      expect(spy).toHaveBeenCalledOnce();
    });
  });
});
