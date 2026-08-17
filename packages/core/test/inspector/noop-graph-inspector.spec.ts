import { NoopGraphInspector } from '../../inspector/noop-graph-inspector.js';

describe('NoopGraphInspector', () => {
  it('should be defined', () => {
    expect(NoopGraphInspector).toBeDefined();
  });

  it('should return a noop function for any property access', () => {
    const anyMethod = (NoopGraphInspector as any).insertNode;
    expect(typeof anyMethod).toBe('function');
  });

  it('should not throw when calling any method', () => {
    expect(() => (NoopGraphInspector as any).insertNode({})).not.toThrow();
    expect(() => (NoopGraphInspector as any).insertEdge({})).not.toThrow();
    expect(() =>
      (NoopGraphInspector as any).insertEntrypoint({}, 'id'),
    ).not.toThrow();
  });

  it('should return undefined from noop calls', () => {
    const result = (NoopGraphInspector as any).insertNode({});
    expect(result).toBeUndefined();
  });

  it('should return the same noop function for different properties', () => {
    const fn1 = (NoopGraphInspector as any).insertNode;
    const fn2 = (NoopGraphInspector as any).insertEdge;
    // Both should be the same noop function since the proxy returns the same one
    expect(typeof fn1).toBe('function');
    expect(typeof fn2).toBe('function');
  });
});
