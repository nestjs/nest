import type { MultipartStorageEngine } from '../interfaces/index.js';

/**
 * Buffers each file into `file.buffer`. The default storage engine, as in
 * multer.
 *
 * @publicApi
 */
export function memoryStorage(): MultipartStorageEngine {
  return {
    _handleFile(_req, file, callback) {
      const chunks: Buffer[] = [];
      file.stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      file.stream.once('error', callback);
      file.stream.once('end', () => {
        const buffer = Buffer.concat(chunks);
        callback(null, { buffer, size: buffer.length });
      });
    },
    _removeFile(_req, file, callback) {
      delete file.buffer;
      callback(null);
    },
  };
}
