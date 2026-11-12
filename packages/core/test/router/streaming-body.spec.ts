import { AsyncLocalStorage } from 'async_hooks';
import { EventEmitter } from 'events';
import { of, Subject } from 'rxjs';
import { Readable } from 'stream';
import { isStreamingBody as isStreamingBodyInCommon } from '../../../common/utils/is-streaming-body.util.js';
import {
  cancelStreamingBody,
  getWebResponseHeaders,
  inferContentType,
  isStreamingBody,
  isStreamingBodyConsumed,
  isWebResponse,
  listenForStreamError,
  openStreamingBody,
  toReadable,
  toResponseChunk,
} from '../../router/streaming-body.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 5));

async function* generator() {
  yield 'chunk';
}

function quietWebStream(onCancel: () => void) {
  return new ReadableStream({
    pull() {
      return new Promise<void>(() => undefined);
    },
    cancel: onCancel,
  });
}

describe('streaming body', () => {
  describe('isStreamingBody', () => {
    it.each<[string, () => unknown]>([
      ['a Response', () => new Response('body')],
      ['a Response with a null body', () => new Response(null)],
      ['a ReadableStream', () => new ReadableStream()],
      ['an async generator', () => generator()],
      ['a Readable', () => Readable.from(['chunk'])],
      [
        'any other async iterable',
        () => ({ [Symbol.asyncIterator]: () => generator() }),
      ],
    ])('should be true for %s', (_, create) => {
      expect(isStreamingBody(create())).toBe(true);
      expect(isStreamingBodyInCommon(create())).toBe(true);
    });

    it.each<[string, unknown]>([
      ['undefined', undefined],
      ['null', null],
      ['a string', 'body'],
      ['a number', 1],
      ['a plain object', { a: 1 }],
      ['an array', [1, 2]],
      ['a Set', new Set([1])],
      ['a sync iterable', { *[Symbol.iterator]() {} }],
      ['a Buffer', Buffer.from('body')],
      ['a Promise', Promise.resolve()],
      ['an Observable', of(1)],
      ['a Subject', new Subject()],
      [
        'a thenable that is also an async iterable, as a Mongoose query is',
        { then() {}, [Symbol.asyncIterator]: () => generator() },
      ],
    ])('should be false for %s', (_, value) => {
      expect(isStreamingBody(value)).toBe(false);
      expect(isStreamingBodyInCommon(value)).toBe(false);
    });

    it('should recognize a Response of another fetch implementation', () => {
      class Response {
        get [Symbol.toStringTag]() {
          return 'Response';
        }
      }
      expect(isWebResponse(new Response())).toBe(true);
    });
  });

  describe('isStreamingBodyConsumed', () => {
    it('should be false for what nothing has read', () => {
      expect(isStreamingBodyConsumed(new Response('body'))).toBe(false);
      expect(isStreamingBodyConsumed(new Response(null))).toBe(false);
      expect(isStreamingBodyConsumed(new ReadableStream())).toBe(false);
      expect(isStreamingBodyConsumed(generator())).toBe(false);
      expect(isStreamingBodyConsumed(Readable.from(['chunk']))).toBe(false);
    });

    it('should be true for a Response that was read', async () => {
      const response = new Response('body');
      await response.text();

      expect(isStreamingBodyConsumed(response)).toBe(true);
    });

    it('should be true for a body that is locked', () => {
      const response = new Response('body');
      response.body!.getReader();
      const stream = new ReadableStream();
      stream.getReader();

      expect(isStreamingBodyConsumed(response)).toBe(true);
      expect(isStreamingBodyConsumed(stream)).toBe(true);
    });

    it('should be true for a ReadableStream that was read to its end', async () => {
      const stream = new ReadableStream({
        start: controller => controller.close(),
      });
      for await (const _ of stream as unknown as AsyncIterable<unknown>) {
        // Drained
      }

      expect(stream.locked).toBe(false);
      expect(isStreamingBodyConsumed(stream)).toBe(true);
    });

    it('should be true for a Readable that was read', async () => {
      const stream = Readable.from(['one', 'two']);
      await new Promise(resolve => stream.once('readable', resolve));
      stream.read();

      expect(isStreamingBodyConsumed(stream)).toBe(true);
    });

    it('should be false for a Readable that failed, which reports that itself', async () => {
      const stream = new Readable({ read() {} });
      stream.on('error', () => undefined);
      stream.destroy(new Error('failed'));
      await flush();

      expect(isStreamingBodyConsumed(stream)).toBe(false);
    });
  });

  describe('listenForStreamError', () => {
    it('should listen for the error of a Readable, once', async () => {
      const error = new Error('ENOENT');
      const stream = new Readable({ read() {} });

      listenForStreamError(stream);
      listenForStreamError(stream);
      expect(stream.listenerCount('error')).toBe(1);
      stream.destroy(error);
      await flush();

      // Still reported to whatever reads it
      await expect(stream.toArray()).rejects.toBe(error);
    });

    it('should leave what is not a stream alone', () => {
      const emitter = new EventEmitter();

      listenForStreamError(emitter);

      expect(emitter.listenerCount('error')).toBe(0);
    });
  });

  describe('openStreamingBody', () => {
    it('should cancel a ReadableStream while a read is in progress', async () => {
      const onCancel = vi.fn();
      const iterator = openStreamingBody(quietWebStream(onCancel));
      const read = iterator.next();

      await iterator.return();

      expect(onCancel).toHaveBeenCalledTimes(1);
      await expect(read).resolves.toEqual({ done: true, value: undefined });
    });

    it('should destroy a Readable while a read is in progress', async () => {
      const stream = new Readable({ read() {} });
      const iterator = openStreamingBody(stream);
      void iterator.next().catch(() => undefined);
      await flush();

      void iterator.return();

      expect(stream.destroyed).toBe(true);
    });

    it('should listen for the error of a Readable it stops before reading it', async () => {
      // As `fs.createReadStream()` does for a file that does not exist: the
      // failure to open it is reported once it is destroyed
      const error = new Error('ENOENT');
      const stream = new Readable({
        construct: callback => setImmediate(callback, error),
        read() {},
      });

      await openStreamingBody(stream).return();
      expect(stream.listenerCount('error')).toBe(1);
      await flush();

      expect(stream.errored).toBe(error);
    });

    it('should call return() of an async generator', async () => {
      const onFinally = vi.fn();
      const iterator = openStreamingBody(
        (async function* () {
          try {
            yield 'chunk';
          } finally {
            onFinally();
          }
        })(),
      );
      await iterator.next();

      await iterator.return();

      expect(onFinally).toHaveBeenCalledTimes(1);
    });

    it('should accept an iterator without return()', async () => {
      const iterator = openStreamingBody({
        [Symbol.asyncIterator]: () => ({
          next: async () => ({ done: true as const, value: undefined }),
        }),
      });

      await expect(iterator.return()).resolves.toBeUndefined();
    });

    it('should turn an iterator that throws into a rejection', async () => {
      const iterator = openStreamingBody({
        [Symbol.asyncIterator]: () => ({
          next() {
            throw new Error('failed');
          },
        }),
      });

      await expect(iterator.next()).rejects.toThrow('failed');
    });
  });

  describe('cancelStreamingBody', () => {
    it('should cancel the body of a Response', async () => {
      const onCancel = vi.fn();

      await cancelStreamingBody(new Response(quietWebStream(onCancel)));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should accept a Response with a null body', async () => {
      await expect(
        cancelStreamingBody(new Response(null)),
      ).resolves.toBeUndefined();
    });

    it('should leave alone a stream something else is reading', async () => {
      const onCancel = vi.fn();
      const stream = quietWebStream(onCancel);
      stream.getReader();

      await cancelStreamingBody(stream);

      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should not start an async generator', async () => {
      const onStart = vi.fn();

      await cancelStreamingBody(
        (async function* () {
          onStart();
          yield 'chunk';
        })(),
      );

      expect(onStart).not.toHaveBeenCalled();
    });

    it('should swallow a failure to stop', async () => {
      await expect(
        cancelStreamingBody({
          [Symbol.asyncIterator]() {
            throw new Error('failed');
          },
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('toResponseChunk', () => {
    const bytes = (value: string | Uint8Array) =>
      Buffer.from(value as Uint8Array).toString();

    it('should leave a string as it is', () => {
      expect(toResponseChunk('chunk')).toBe('chunk');
      expect(toResponseChunk('')).toBe('');
    });

    it('should send binary data as bytes', () => {
      const encoded = new TextEncoder().encode('chunk');

      expect(bytes(toResponseChunk(encoded))).toBe('chunk');
      expect(bytes(toResponseChunk(Buffer.from('chunk')))).toBe('chunk');
      expect(bytes(toResponseChunk(encoded.buffer))).toBe('chunk');
      expect(bytes(toResponseChunk(new DataView(encoded.buffer)))).toBe(
        'chunk',
      );
    });

    it('should respect the window of a view', () => {
      const encoded = new TextEncoder().encode('a chunk of it');

      expect(bytes(toResponseChunk(encoded.subarray(2, 7)))).toBe('chunk');
    });

    it('should send anything else as a line of JSON', () => {
      expect(toResponseChunk({ a: 1 })).toBe('{"a":1}\n');
      expect(toResponseChunk([1])).toBe('[1]\n');
      expect(toResponseChunk(1)).toBe('1\n');
      expect(toResponseChunk(true)).toBe('true\n');
      expect(toResponseChunk(null)).toBe('null\n');
    });

    it('should send nothing for what has no JSON form', () => {
      expect(toResponseChunk(undefined)).toBe('');
      expect(toResponseChunk(() => undefined)).toBe('');
    });

    it('should throw for what JSON cannot serialize', () => {
      expect(() => toResponseChunk(1n)).toThrow(TypeError);
    });
  });

  describe('inferContentType', () => {
    it.each<[unknown, string]>([
      ['chunk', 'text/plain; charset=utf-8'],
      ['', 'text/plain; charset=utf-8'],
      [new Uint8Array(1), 'application/octet-stream'],
      [Buffer.alloc(1), 'application/octet-stream'],
      [new ArrayBuffer(1), 'application/octet-stream'],
      [{ a: 1 }, 'application/x-ndjson'],
      [[1], 'application/x-ndjson'],
      [1, 'application/x-ndjson'],
    ])('should answer for %s', (value, expected) => {
      expect(inferContentType(value)).toBe(expected);
    });
  });

  describe('getWebResponseHeaders', () => {
    const fetched = (headers: Record<string, string>) => {
      const response = new Response(null, { headers });
      Object.defineProperty(response, 'type', { value: 'basic' });
      return response;
    };

    it('should return the headers of a Response as they are', () => {
      const response = new Response(null, {
        headers: {
          'x-custom': 'yes',
          connection: 'close',
          'content-encoding': 'gzip',
          'content-length': '5',
        },
      });

      expect(new Map(getWebResponseHeaders(response))).toEqual(
        new Map([
          ['x-custom', 'yes'],
          ['connection', 'close'],
          ['content-encoding', 'gzip'],
          ['content-length', '5'],
        ]),
      );
    });

    it('should leave out Set-Cookie', () => {
      const headers = new Headers();
      headers.append('set-cookie', 'a=1');
      headers.append('set-cookie', 'b=2');
      headers.append('x-custom', 'yes');

      expect(getWebResponseHeaders(new Response(null, { headers }))).toEqual([
        ['x-custom', 'yes'],
      ]);
    });

    it('should leave out the connection headers of what fetch() returned', () => {
      const headers = fetched({
        'x-custom': 'yes',
        connection: 'keep-alive',
        'keep-alive': 'timeout=5',
        'transfer-encoding': 'chunked',
      });

      expect(getWebResponseHeaders(headers)).toEqual([['x-custom', 'yes']]);
    });

    it('should leave out the encoding fetch() decoded and its length', () => {
      expect(
        new Map(
          getWebResponseHeaders(
            fetched({ 'content-encoding': 'gzip', 'content-length': '5' }),
          ),
        ).size,
      ).toBe(0);
    });

    it('should keep the length of a body fetch() did not decode', () => {
      expect(getWebResponseHeaders(fetched({ 'content-length': '5' }))).toEqual(
        [['content-length', '5']],
      );
    });
  });

  describe('toReadable', () => {
    const iterate = (...values: unknown[]) => {
      const iterator = openStreamingBody(
        (async function* () {
          yield* values;
        })(),
      );
      return iterator;
    };

    it('should send the first chunk, then what is left', async () => {
      const chunks: unknown[] = [];
      for await (const chunk of toReadable(iterate('b', { c: 1 }), 'a')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['a', 'b', '{"c":1}\n']);
    });

    it('should send an empty first chunk', async () => {
      const chunks: unknown[] = [];
      for await (const chunk of toReadable(iterate(), '')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['']);
    });

    it('should read the body in the async context it was created in', async () => {
      const storage = new AsyncLocalStorage<string>();
      const stream = storage.run('this request', () =>
        toReadable(
          openStreamingBody(
            (async function* () {
              yield storage.getStore();
              yield { toJSON: () => storage.getStore() };
            })(),
          ),
          'first',
        ),
      );

      const chunks = await storage.run('another request', () =>
        stream.toArray(),
      );

      expect(chunks).toEqual(['first', 'this request', '"this request"\n']);
    });

    it('should read no further than asked', async () => {
      const onPull = vi.fn();
      const stream = toReadable(
        openStreamingBody(
          (async function* () {
            for (;;) {
              onPull();
              yield 'chunk';
            }
          })(),
        ),
        'first',
      );

      await new Promise(resolve => stream.once('readable', resolve));
      await flush();

      expect(onPull.mock.calls.length).toBeLessThanOrEqual(1);
      stream.destroy();
    });

    it('should stop the body when destroyed', async () => {
      const onCancel = vi.fn();
      const stream = toReadable(
        openStreamingBody(quietWebStream(onCancel)),
        'first',
      );

      stream.destroy();
      await flush();

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should fail for a chunk JSON cannot serialize, and stop the body', async () => {
      const onFinally = vi.fn();
      const stream = toReadable(
        openStreamingBody(
          (async function* () {
            try {
              yield 1n;
            } finally {
              onFinally();
            }
          })(),
        ),
        'first',
      );

      await expect(
        (async () => {
          for await (const _ of stream) {
            // Drained
          }
        })(),
      ).rejects.toThrow(TypeError);
      await flush();

      expect(onFinally).toHaveBeenCalledTimes(1);
    });
  });
});
