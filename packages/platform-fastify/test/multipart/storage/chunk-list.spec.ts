import { ChunkList } from '../../../multipart/storage/chunk-list.js';

describe('ChunkList', () => {
  const collect = (chunks: Buffer[]) => {
    const list = new ChunkList();
    for (const chunk of chunks) {
      list.push(chunk);
    }
    return list;
  };

  it('should merge runs of small chunks as they arrive', () => {
    const bytes = Buffer.alloc(100_000, 'a');
    const list = collect(Array.from(bytes, byte => Buffer.of(byte)));

    // One Buffer per complete run of 256 chunks, and those of the last run
    expect(list.count).toBe(Math.floor(100_000 / 256) + (100_000 % 256));
    expect(list.toBuffer().equals(bytes)).toBe(true);
  });

  it('should keep large chunks as they are', () => {
    const chunks = Array.from({ length: 300 }, (_, i) =>
      Buffer.alloc(16 * 1024, i),
    );
    const list = collect(chunks);

    expect(list.count).toBe(300);
    expect(list.toBuffer().equals(Buffer.concat(chunks))).toBe(true);
  });

  it('should keep the bytes in order when small and large chunks are mixed', () => {
    const small = (from: number) =>
      Array.from({ length: 300 }, (_, i) => Buffer.from(`${from + i},`));
    const chunks = [
      ...small(0),
      Buffer.alloc(300 * 1024, 'x'),
      ...small(300),
      Buffer.alloc(2 * 1024, 'y'),
      ...small(600),
    ];

    expect(collect(chunks).toBuffer().equals(Buffer.concat(chunks))).toBe(true);
  });

  it('should give an empty Buffer for no chunk', () => {
    expect(collect([]).toBuffer()).toHaveLength(0);
  });
});
