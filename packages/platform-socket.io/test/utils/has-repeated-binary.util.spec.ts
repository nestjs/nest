import { hasRepeatedBinary } from '../../utils/has-repeated-binary.util.js';

describe('hasRepeatedBinary', () => {
  it('should be false for a message without binary data', () => {
    expect(hasRepeatedBinary(['text', 1, { a: [null, true] }])).toBe(false);
    expect(hasRepeatedBinary(undefined)).toBe(false);
  });

  it('should be false for a message with distinct binary values', () => {
    const buffer = Buffer.from('x');
    expect(
      hasRepeatedBinary([
        buffer,
        Buffer.from('x'),
        // a view of the same memory is a value of its own
        new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length),
        { file: new ArrayBuffer(1) },
      ]),
    ).toBe(false);
  });

  it.each([
    ['a Buffer', Buffer.from('x')],
    ['an ArrayBuffer', new ArrayBuffer(1)],
    ['a typed array', new Uint16Array(1)],
    ['a Blob', new Blob(['x'])],
  ])('should be true for a message that refers to %s twice', (_, binary) => {
    expect(hasRepeatedBinary([{ a: binary }, [binary]])).toBe(true);
  });

  it('should be false for a message that refers to an object twice', () => {
    const shared = { text: 'x' };
    const cyclic: Record<string, unknown> = { shared };
    cyclic.self = cyclic;
    expect(hasRepeatedBinary([shared, cyclic])).toBe(false);
  });

  it('should look through a message nested deeper than the stack allows', () => {
    const buffer = Buffer.from('x');
    let nested: unknown = buffer;
    for (let depth = 0; depth < 100_000; depth++) {
      nested = [nested];
    }
    expect(hasRepeatedBinary([nested, buffer])).toBe(true);
  });
});
