import { assignCustomParameterMetadata } from '../../utils/assign-custom-metadata.util.js';

describe('assignCustomParameterMetadata', () => {
  const factory = (data: any, context: any) => data;
  const mockPipe = { transform: () => null };

  it('should use the correct composite key format', () => {
    const args = {};
    const result = assignCustomParameterMetadata(args, 'abc', 2, factory);
    expect(result).toHaveProperty('abc__customRouteArgs__:2');
  });

  it('should preserve existing args in the returned object', () => {
    const args = { 0: { index: 0, data: 'existing' } };
    const result = assignCustomParameterMetadata(args, 'xyz', 1, factory);
    expect(result['0']).toEqual({ index: 0, data: 'existing' });
  });

  it('should store index, factory, data, and pipes in the entry', () => {
    const data = { param: 'value' };
    const pipes = [mockPipe];
    const result = assignCustomParameterMetadata(
      {},
      'def',
      3,
      factory,
      data,
      undefined,
      ...pipes,
    );
    const entry = result['def__customRouteArgs__:3'];
    expect(entry.index).toBe(3);
    expect(entry.factory).toBe(factory);
    expect(entry.data).toBe(data);
    expect(entry.pipes).toEqual(pipes);
  });

  it('should set data to undefined when not provided', () => {
    const result = assignCustomParameterMetadata({}, 'a', 0, factory);
    expect(result['a__customRouteArgs__:0'].data).toBeUndefined();
  });

  it('should set pipes to an empty array when not provided', () => {
    const result = assignCustomParameterMetadata({}, 'b', 1, factory);
    expect(result['b__customRouteArgs__:1'].pipes).toEqual([]);
  });

  it('should accept a numeric paramtype', () => {
    const result = assignCustomParameterMetadata({}, 123, 0, factory);
    expect(result).toHaveProperty('123__customRouteArgs__:0');
  });
});
