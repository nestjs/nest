import type { MultipartStorageEngine } from '../interfaces/index.js';

/**
 * Keeps each file in memory as `file.buffer`. The default storage engine, as
 * in multer. Reads the parsed `Blob` directly rather than streaming it.
 *
 * @publicApi
 */
export function memoryStorage(): MultipartStorageEngine {
  return {
    _handleFile(_req, file, callback) {
      file.blob.arrayBuffer().then(
        bytes => {
          const buffer = Buffer.from(bytes);
          callback(null, { buffer, size: buffer.length });
        },
        err => callback(err),
      );
    },
    _removeFile(_req, file, callback) {
      delete file.buffer;
      callback(null);
    },
  };
}
