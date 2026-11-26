import { Readable, Transform } from 'stream';
import { types } from 'util';

/**
 * response.write() throws for a chunk that is neither a string nor bytes,
 * inside the "data" listener of pipe(), where nothing catches it. A source
 * in object mode (e.g. "Readable.from()" over values) is checked as it is
 * read instead, and fails like any other stream on such a chunk.
 *
 * @param sender what sends the stream, for the error (e.g. "A StreamableFile")
 */
export function toWritableChunks(stream: Readable, sender: string): Readable {
  if (!stream.readableObjectMode) {
    return stream;
  }
  // Passes the chunks on as they are (an empty string, too, which sends
  // the headers early), one at a time, so that it does not read ahead of
  // the response
  const checked = new Transform({
    objectMode: true,
    highWaterMark: 1,
    transform(chunk, _encoding, callback) {
      callback(null, isWritableChunk(chunk) ? chunk : undefined);
    },
  });
  // Registered before pipe(), so the source fails as it emits the chunk,
  // before it can end. Its error handler then answers the request, or
  // aborts a response that has started, as for a file that fails midway.
  stream.on('data', chunk => {
    if (!isWritableChunk(chunk)) {
      checked.destroy();
      stream.destroy(
        new TypeError(
          `${sender} can only send string and Uint8Array chunks, received ${typeof chunk}`,
        ),
      );
    }
  });
  return stream.pipe(checked);
}

function isWritableChunk(chunk: unknown): chunk is string | Uint8Array {
  return typeof chunk === 'string' || types.isUint8Array(chunk);
}
