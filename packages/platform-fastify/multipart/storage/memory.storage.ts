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
      const onData = (chunk: Buffer) => chunks.push(chunk);
      const onError = (err: Error) => {
        stopListening();
        callback(err);
      };
      const onEnd = () => {
        stopListening();
        const buffer = Buffer.concat(chunks);
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
