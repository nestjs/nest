import { expect } from 'chai';
import { assignCustomParameterMetadata } from '../../utils/assign-custom-metadata.util';

describe('assignCustomParameterMetadata', () => {
  const factory = (data: any, context: any) => data;
  const mockPipe = { transform: () => null };

  it('should use the correct composite key format', () => {
    const args = {};
    const result = assignCustomParameterMetadata(args, 'abc', 2, factory);
    expect(result).to.have.property('abc__customRouteArgs__:2');
  });

  it('should preserve existing args in the returned object', () => {
    const args = { 0: { index: 0, data: 'existing' } };
    const result = assignCustomParameterMetadata(args, 'xyz', 1, factory);
    expect(result['0']).to.be.eql({ index: 0, data: 'existing' });
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
      ...pipes,
    );
    const entry = result['def__customRouteArgs__:3'];
    expect(entry.index).to.equal(3);
    expect(entry.factory).to.equal(factory);
    expect(entry.data).to.equal(data);
    expect(entry.pipes).to.be.eql(pipes);
  });

  it('should set data to undefined when not provided', () => {
    const result = assignCustomParameterMetadata({}, 'a', 0, factory);
    expect(result['a__customRouteArgs__:0'].data).to.be.undefined;
  });

  it('should set pipes to an empty array when not provided', () => {
    const result = assignCustomParameterMetadata({}, 'b', 1, factory);
    expect(result['b__customRouteArgs__:1'].pipes).to.be.eql([]);
  });

  it('should accept a numeric paramtype', () => {
    const result = assignCustomParameterMetadata({}, 123, 0, factory);
    expect(result).to.have.property('123__customRouteArgs__:0');
  });
});
