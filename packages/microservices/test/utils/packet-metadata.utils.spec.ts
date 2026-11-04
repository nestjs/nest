import {
  hasPacketMetadata,
  toPacketMetadata,
} from '../../utils/packet-metadata.utils.js';

describe('toPacketMetadata', () => {
  it('should keep the entries that hold a single string', () => {
    expect(
      toPacketMetadata([
        ['x-request-id', 'trace-1'],
        ['x-count', 3],
        ['x-tags', ['a', 'b']],
        ['x-binary', Buffer.from('abc')],
        ['x-absent', undefined],
        ['empty', ''],
      ]),
    ).toEqual({ 'x-request-id': 'trace-1', empty: '' });
  });

  it('should return undefined when no entry qualifies', () => {
    expect(toPacketMetadata([])).toBeUndefined();
    expect(toPacketMetadata([['x-count', 3]])).toBeUndefined();
  });
});

describe('hasPacketMetadata', () => {
  it('should be true only for metadata with entries', () => {
    expect(hasPacketMetadata({ 'x-request-id': 'trace-1' })).toBe(true);
    expect(hasPacketMetadata({})).toBe(false);
    expect(hasPacketMetadata(undefined)).toBe(false);
  });
});
