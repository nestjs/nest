import {
  closeArrayGaps,
  withoutArrayGaps,
} from '../../utils/close-array-gaps.util.js';

describe('withoutArrayGaps', () => {
  it('should return the items in order, without the gaps', () => {
    const array = ['a', 'b', 'c'];
    delete array[1];
    expect(withoutArrayGaps(array)).toEqual(['a', 'c']);
    expect(array).toHaveLength(3);
  });

  it('should return an array without gaps as it is', () => {
    const array = ['a', 'b'];
    expect(withoutArrayGaps(array)).toBe(array);
  });

  it('should leave out the properties that are not indexes', () => {
    const array: any = [];
    array[2] = 'a';
    array.extra = 'x';
    expect(withoutArrayGaps(array)).toEqual(['a']);
  });

  it('should only visit the items, whatever the length', () => {
    const array: string[] = [];
    array[2 ** 32 - 2] = 'last';
    expect(withoutArrayGaps(array)).toEqual(['last']);
  });
});

describe('closeArrayGaps', () => {
  it('should close the gaps of nested arrays in place, in order', () => {
    const inner: string[] = [];
    inner[5] = 'z';
    const outer: unknown[] = [];
    outer[2] = { list: inner };
    outer[0] = 'first';
    const value = { outer, dense: ['a', 'b'], text: 'x' };
    closeArrayGaps(value);
    expect(value).toEqual({
      outer: ['first', { list: ['z'] }],
      dense: ['a', 'b'],
      text: 'x',
    });
    expect(value.outer).toBe(outer);
    expect(outer).toHaveLength(2);
  });

  it('should keep the properties of an array that are not indexes', () => {
    const array: any = [];
    array[3] = 'a';
    array.extra = 'x';
    closeArrayGaps(array);
    expect(array).toHaveLength(1);
    expect(array.extra).toBe('x');
  });

  it('should leave arrays that cannot be changed as they are', () => {
    const array: string[] = [];
    array[2] = 'a';
    Object.freeze(array);
    expect(() => closeArrayGaps({ array })).not.toThrow();
    expect(array).toHaveLength(3);
  });

  it('should skip typed arrays and built-in types', () => {
    const buffer = Buffer.from('abc');
    const date = new Date(0);
    const value = { buffer, date, map: new Map([['a', []]]) };
    closeArrayGaps(value);
    expect(value.buffer).toBe(buffer);
    expect(value.date).toBe(date);
  });

  it('should walk a value with a cycle once', () => {
    const value: any = { list: [] };
    value.list[4] = value;
    closeArrayGaps(value);
    expect(value.list).toEqual([value]);
  });

  it('should walk a value nested deeper than the call stack', () => {
    let value: any = [];
    value[1] = 'x';
    const root = value;
    for (let i = 0; i < 100_000; i++) {
      value = [value];
    }
    expect(() => closeArrayGaps(value)).not.toThrow();
    expect(root).toEqual(['x']);
  });

  it('should leave primitives alone', () => {
    expect(() => closeArrayGaps('x')).not.toThrow();
    expect(() => closeArrayGaps(undefined)).not.toThrow();
  });
});
