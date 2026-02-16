import { Readable } from 'stream';
import {
  StorageEngine,
  StorageCallback,
  RemoveCallback,
  MemoryStorageOptions,
} from './storage.interface';
import {
  H3UploadedFile,
  H3FileStream,
} from '../interfaces/multer-options.interface';

/**
 * Memory storage engine for keeping uploaded files in memory as buffers.
 * This is the default storage engine.
 *
 * @example
 * ```typescript
 * const storage = new MemoryStorage();
 * ```
 *
 * @publicApi
 */
export class MemoryStorage implements StorageEngine {
  constructor(_options: MemoryStorageOptions = {}) {
    // No options currently needed
  }

  /**
   * Handle file storage by keeping it in memory.
   * If file is stream-based, buffers the entire stream.
   */
  _handleFile(
    _req: any,
    file: H3UploadedFile | H3FileStream,
    callback: StorageCallback,
  ): void {
    // Check if file is already buffer-based
    if ('buffer' in file && file.buffer) {
      // Already in memory, no additional processing needed
      callback(null, {
        buffer: file.buffer,
        size: file.buffer.length,
      });
      return;
    }

    // Stream-based file - buffer the entire stream
    if ('stream' in file && file.stream) {
      this.bufferStream(file)
        .then(buffer => {
          callback(null, {
            buffer,
            size: buffer.length,
          });
        })
        .catch(err => {
          callback(err);
        });
      return;
    }

    callback(new Error('File has neither buffer nor stream'));
  }

  /**
   * Buffer an entire stream into memory.
   */
  private async bufferStream(file: H3FileStream): Promise<Buffer> {
    const chunks: Buffer[] = [];

    const nodeStream = this.toNodeStream(file.stream);

    return new Promise((resolve, reject) => {
      nodeStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      nodeStream.on('error', (err: Error) => {
        reject(err);
      });

      nodeStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  /**
   * Convert a ReadableStream (Web API) to Node.js Readable stream if needed.
   */
  private toNodeStream(
    stream: Readable | ReadableStream<Uint8Array>,
  ): Readable {
    if (stream instanceof Readable) {
      return stream;
    }

    // Web API ReadableStream - convert to Node.js stream
    const reader = stream.getReader();
    return new Readable({
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        } catch (err) {
          this.destroy(err as Error);
        }
      },
    });
  }

  /**
   * Remove a file from memory (no-op for memory storage).
   */
  _removeFile(
    _req: any,
    _file: H3UploadedFile,
    callback: RemoveCallback,
  ): void {
    // Nothing to do for memory storage
    callback(null);
  }
}

/**
 * Factory function to create a MemoryStorage instance.
 *
 * @param options - Memory storage configuration options
 * @returns A new MemoryStorage instance
 *
 * @example
 * ```typescript
 * const storage = memoryStorage();
 * ```
 *
 * @publicApi
 */
export function memoryStorage(options?: MemoryStorageOptions): MemoryStorage {
  return new MemoryStorage(options);
}
