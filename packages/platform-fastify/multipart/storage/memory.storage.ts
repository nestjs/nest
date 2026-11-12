import type { MultipartStorageEngine } from '../interfaces/index.js';
import { ChunkList } from './chunk-list.js';

/**
 * Buffers each file into `file.buffer`. The default storage engine, as in
 * multer.
 *
 * @publicApi
 */
export function memoryStorage(): MultipartStorageEngine {
  return {
    _handleFile(_req, file, callback) {
      // Merges runs of small chunks as they arrive (see `ChunkList`)
      const chunks = new ChunkList();
      const onData = (chunk: Buffer) => chunks.push(chunk);
      const onError = (err: Error) => {
        stopListening();
        callback(err);
      };
      const onEnd = () => {
        stopListening();
        const buffer = chunks.toBuffer();
        callback(null, { buffer, size: buffer.length });
      };
      // `@fastify/multipart` keeps every part's stream until the request
      // ends, and with it these listeners and the chunks they hold.
      const stopListening = () =>
        file.stream.off('data', onData).off('error', onError).off('end', onEnd);
      file.stream.on('data', onData).once('error', onError).once('end', onEnd);
    },
    _removeFile(_req, file, callback) {
      delete file.buffer;
      callback(null);
    },
  };
}
