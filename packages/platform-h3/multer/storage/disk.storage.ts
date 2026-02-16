import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import {
  StorageEngine,
  StorageCallback,
  RemoveCallback,
  DiskStorageOptions,
} from './storage.interface';
import {
  H3UploadedFile,
  H3FileStream,
} from '../interfaces/multer-options.interface';

/**
 * Generates a random filename using crypto.
 */
function generateRandomFilename(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Default destination function that returns the OS temp directory.
 */
function defaultDestination(
  _req: any,
  _file: H3UploadedFile | H3FileStream,
  callback: (error: Error | null, destination: string) => void,
): void {
  callback(null, require('os').tmpdir());
}

/**
 * Default filename function that generates a random filename.
 */
function defaultFilename(
  _req: any,
  _file: H3UploadedFile | H3FileStream,
  callback: (error: Error | null, filename: string) => void,
): void {
  callback(null, generateRandomFilename());
}

/**
 * Disk storage engine for storing uploaded files to the filesystem.
 *
 * @example
 * ```typescript
 * const storage = new DiskStorage({
 *   destination: './uploads',
 *   filename: (req, file, cb) => {
 *     cb(null, `${Date.now()}-${file.originalname}`);
 *   }
 * });
 * ```
 *
 * @publicApi
 */
export class DiskStorage implements StorageEngine {
  private getDestination: (
    req: any,
    file: H3UploadedFile | H3FileStream,
    callback: (error: Error | null, destination: string) => void,
  ) => void;

  private getFilename: (
    req: any,
    file: H3UploadedFile | H3FileStream,
    callback: (error: Error | null, filename: string) => void,
  ) => void;

  constructor(options: DiskStorageOptions = {}) {
    // Set up destination resolver
    if (typeof options.destination === 'string') {
      const dest = options.destination;
      this.getDestination = (_req, _file, cb) => cb(null, dest);
    } else {
      this.getDestination = options.destination || defaultDestination;
    }

    // Set up filename resolver
    this.getFilename = options.filename || defaultFilename;
  }

  /**
   * Handle file storage by writing to disk.
   */
  _handleFile(
    req: any,
    file: H3UploadedFile | H3FileStream,
    callback: StorageCallback,
  ): void {
    this.getDestination(req, file, (destError, destination) => {
      if (destError) {
        return callback(destError);
      }

      this.getFilename(req, file, (nameError, filename) => {
        if (nameError) {
          return callback(nameError);
        }

        const finalPath = path.join(destination, filename);

        // Ensure destination directory exists
        fs.mkdir(destination, { recursive: true }, mkdirError => {
          if (mkdirError) {
            return callback(mkdirError);
          }

          // Check if file is stream-based or buffer-based
          if ('stream' in file && file.stream) {
            // Stream-based file
            this.writeFromStream(file, finalPath, callback, {
              destination,
              filename,
            });
          } else if ('buffer' in file && file.buffer) {
            // Buffer-based file
            this.writeFromBuffer(file, finalPath, callback, {
              destination,
              filename,
            });
          } else {
            callback(new Error('File has neither buffer nor stream'));
          }
        });
      });
    });
  }

  /**
   * Write file from buffer.
   */
  private writeFromBuffer(
    file: H3UploadedFile,
    finalPath: string,
    callback: StorageCallback,
    info: { destination: string; filename: string },
  ): void {
    const buffer = file.buffer!;
    fs.writeFile(finalPath, buffer, writeError => {
      if (writeError) {
        return callback(writeError);
      }

      callback(null, {
        destination: info.destination,
        filename: info.filename,
        path: finalPath,
        size: buffer.length,
      });
    });
  }

  /**
   * Write file from stream.
   */
  private writeFromStream(
    file: H3FileStream,
    finalPath: string,
    callback: StorageCallback,
    info: { destination: string; filename: string },
  ): void {
    const writeStream = fs.createWriteStream(finalPath);
    let size = 0;

    // Convert ReadableStream to Node.js stream if needed
    const nodeStream = this.toNodeStream(file.stream);

    nodeStream.on('data', (chunk: Buffer) => {
      size += chunk.length;
    });

    nodeStream.on('error', (err: Error) => {
      writeStream.destroy();
      fs.unlink(finalPath, () => {
        // Ignore unlink errors
      });
      callback(err);
    });

    writeStream.on('error', (err: Error) => {
      nodeStream.destroy();
      fs.unlink(finalPath, () => {
        // Ignore unlink errors
      });
      callback(err);
    });

    writeStream.on('finish', () => {
      callback(null, {
        destination: info.destination,
        filename: info.filename,
        path: finalPath,
        size,
      });
    });

    nodeStream.pipe(writeStream);
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
   * Remove a stored file from disk.
   */
  _removeFile(_req: any, file: H3UploadedFile, callback: RemoveCallback): void {
    const filePath = (file as any).path;
    if (!filePath) {
      return callback(null);
    }

    fs.unlink(filePath, err => {
      // Ignore ENOENT errors (file doesn't exist)
      if (err && err.code !== 'ENOENT') {
        return callback(err);
      }
      callback(null);
    });
  }
}

/**
 * Factory function to create a DiskStorage instance.
 *
 * @param options - Disk storage configuration options
 * @returns A new DiskStorage instance
 *
 * @example
 * ```typescript
 * const storage = diskStorage({
 *   destination: './uploads',
 *   filename: (req, file, cb) => {
 *     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
 *     cb(null, file.fieldname + '-' + uniqueSuffix);
 *   }
 * });
 * ```
 *
 * @publicApi
 */
export function diskStorage(options?: DiskStorageOptions): DiskStorage {
  return new DiskStorage(options);
}
