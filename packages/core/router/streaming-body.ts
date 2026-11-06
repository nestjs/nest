import { isFunction, isNil, isObject, isString } from '@nestjs/common/internal';
import { AsyncResource } from 'async_hooks';
import { Readable } from 'stream';
import { types } from 'util';

/**
 * What a route handler can return to have it sent as it is produced, instead
 * of serialized: a web `Response`, a `ReadableStream`, or any other async
 * iterable (an async generator or a Node.js `Readable`, among others).
 */
export type StreamingBody =
  Response | ReadableStream<unknown> | AsyncIterable<unknown>;

type BodySource = Exclude<StreamingBody, Response>;

export interface StreamingBodyIterator {
  next(): Promise<IteratorResult<unknown>>;
  return(): Promise<unknown>;
}

/**
 * What `fetch()` hands back still describes the connection it was received on.
 */
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

export function isWebResponse(value: unknown): value is Response {
  return Object.prototype.toString.call(value) === '[object Response]';
}

/**
 * An async iterable that is also a thenable, like a Mongoose query, stands for
 * what it resolves to. Arrays and other sync iterables are not streams either.
 */
export function isStreamingBody(value: unknown): value is StreamingBody {
  return (
    isObject(value) &&
    ((isFunction(value[Symbol.asyncIterator]) && !isFunction(value['then'])) ||
      isWebResponse(value))
  );
}

function getSource(body: StreamingBody): BodySource | null {
  return isWebResponse(body) ? body.body : body;
}

/**
 * Whether something has read from the body already, as far as it can be told:
 * only an async generator itself knows that. A stream that failed instead is
 * left to report its own error when it is read.
 */
export function isStreamingBodyConsumed(body: StreamingBody): boolean {
  const source = getSource(body);
  return (
    !isNil(source) &&
    ((source as ReadableStream).locked === true ||
      (Readable.isDisturbed(source as Readable) &&
        !(source as Readable).errored))
  );
}

/**
 * Opens the body for reading. Neither the async iterator of a `ReadableStream`
 * nor that of a `Readable` stops the stream until the read in progress settles,
 * which an upstream that went quiet may never do, so these are stopped directly.
 */
export function openStreamingBody(source: BodySource): StreamingBodyIterator {
  if (isFunction((source as ReadableStream).getReader)) {
    const reader = (source as ReadableStream).getReader();
    return { next: () => reader.read(), return: () => reader.cancel() };
  }
  const iterator = source[Symbol.asyncIterator]();
  return {
    next: async () => iterator.next(),
    return: async () => {
      (source as Readable).destroy?.();
      return iterator.return?.();
    },
  };
}

/**
 * Stops a body that will not be sent, so that what produces it (e.g. a paid
 * LLM call) stops as well.
 */
export async function cancelStreamingBody(body: StreamingBody) {
  const source = getSource(body);
  if (isNil(source) || (source as ReadableStream).locked) {
    return;
  }
  try {
    await openStreamingBody(source).return();
  } catch {
    // Nothing to do about it
  }
}

/**
 * Turns what a body yields into what a response can write: strings and binary
 * data as they are, and anything else as a line of JSON (NDJSON).
 */
export function toResponseChunk(value: unknown): string | Uint8Array {
  if (isString(value)) {
    return value;
  }
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (types.isAnyArrayBuffer(value)) {
    return Buffer.from(value);
  }
  const json = JSON.stringify(value);
  return json === undefined ? '' : `${json}\n`;
}

export function inferContentType(value: unknown): string {
  if (isString(value)) {
    return 'text/plain; charset=utf-8';
  }
  return ArrayBuffer.isView(value) || types.isAnyArrayBuffer(value)
    ? 'application/octet-stream'
    : 'application/x-ndjson';
}

/**
 * The headers of a `Response` to send, as they are unless it came from
 * `fetch()`: that decodes the body, but leaves `Content-Encoding` and the
 * `Content-Length` of the encoded body in place. `Set-Cookie` is left out, as
 * only `getSetCookie()` tells its values apart in every implementation.
 */
export function getWebResponseHeaders(response: Response): [string, string][] {
  const isFetched = response.type !== 'default';
  const isDecoded = isFetched && response.headers.has('content-encoding');
  const headers: [string, string][] = [];
  response.headers.forEach((value, name) => {
    const isDropped =
      name === 'set-cookie' ||
      (isFetched && HOP_BY_HOP_HEADERS.has(name)) ||
      (isDecoded && (name === 'content-encoding' || name === 'content-length'));
    if (!isDropped) {
      headers.push([name, value]);
    }
  });
  return headers;
}

/**
 * A stream of what is left of the body, with the chunk that was already read
 * first. It reads a chunk only when the response can take one, and destroying
 * it (the adapters do when the client goes away) stops the body.
 */
export function toReadable(
  iterator: StreamingBodyIterator,
  firstChunk: string | Uint8Array,
): Readable {
  // Destroyed when the client goes away, which on Node.js before 22.16 happens
  // outside of the request's async context. `finally` blocks run in the context
  // of whoever stops a generator, and may need AsyncLocalStorage stores.
  const asyncScope = new AsyncResource('StreamingBody');
  let pendingChunk: string | Uint8Array | undefined = firstChunk;
  return Readable.from({
    [Symbol.asyncIterator]() {
      return this;
    },
    next: async () => {
      if (pendingChunk !== undefined) {
        const value = pendingChunk;
        pendingChunk = undefined;
        return { done: false, value };
      }
      const result = await iterator.next();
      return result.done
        ? { done: true, value: undefined }
        : { done: false, value: toResponseChunk(result.value) };
    },
    return: async () => {
      await asyncScope.runInAsyncScope(() => iterator.return());
      return { done: true, value: undefined };
    },
  } as AsyncIterableIterator<string | Uint8Array>);
}
