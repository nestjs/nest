// See `ChunkList`
const CHUNK_RUN_LENGTH = 256;
const LARGE_CHUNK_SIZE = 1024;

/**
 * The chunks of a file, kept until it is buffered. The client decides how a
 * request body is cut (down to one byte per chunk with chunked transfer
 * encoding), the file stream passes those cuts on, and each chunk is a
 * Buffer of its own, which takes a few hundred bytes of memory whatever it
 * holds. Every run of `CHUNK_RUN_LENGTH` chunks is therefore merged into one
 * Buffer as soon as it is complete, so that a file being uploaded takes
 * memory for its size, which `limits.fileSize` bounds, rather than for its
 * number of chunks. A run whose chunks average `LARGE_CHUNK_SIZE` bytes or
 * more is kept as it is, as merging it would save little.
 *
 * @internal
 */
export class ChunkList {
  private readonly chunks: Buffer[] = [];
  private size = 0;
  // The chunks at the end of `chunks` not looked at for merging yet, and
  // their size
  private unmerged = 0;
  private unmergedSize = 0;

  /** The number of Buffers held. */
  public get count() {
    return this.chunks.length;
  }

  public push(chunk: Buffer) {
    this.chunks.push(chunk);
    this.size += chunk.length;
    this.unmergedSize += chunk.length;
    if (++this.unmerged === CHUNK_RUN_LENGTH) {
      if (this.unmergedSize < CHUNK_RUN_LENGTH * LARGE_CHUNK_SIZE) {
        this.chunks.push(
          Buffer.concat(this.chunks.splice(-this.unmerged), this.unmergedSize),
        );
      }
      this.unmerged = 0;
      this.unmergedSize = 0;
    }
  }

  /** All the chunks, as one Buffer. */
  public toBuffer(): Buffer {
    return Buffer.concat(this.chunks, this.size);
  }
}
