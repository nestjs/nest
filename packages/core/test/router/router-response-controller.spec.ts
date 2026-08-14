import { isNil, isObject } from '@nestjs/common/utils/shared.utils.js';
import { IncomingMessage, ServerResponse } from 'http';
import { Observable, of, Subject } from 'rxjs';
import { EventEmitter } from 'events';
import { PassThrough, Writable } from 'stream';
import {
  HttpStatus,
  RequestMethod,
  SSE_ABORT_CONTROLLER,
} from '../../../common/index.js';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer.js';
import { RouterResponseController } from '../../router/router-response-controller.js';
import { SseStream } from '../../router/sse-stream.js';
import { NoopHttpAdapter } from '../utils/noop-adapter.js';

describe('RouterResponseController', () => {
  let adapter: NoopHttpAdapter;
  let routerResponseController: RouterResponseController;

  beforeEach(() => {
    adapter = new NoopHttpAdapter({});
    routerResponseController = new RouterResponseController(adapter);
  });

  describe('apply', () => {
    let response: {
      send: ReturnType<typeof vi.fn>;
      status?: ReturnType<typeof vi.fn>;
      json: ReturnType<typeof vi.fn>;
    };
    beforeEach(() => {
      response = { send: vi.fn(), json: vi.fn(), status: vi.fn() };
    });
    describe('when result is', () => {
      beforeEach(() => {
        vi.spyOn(adapter, 'reply').mockImplementation(
          (responseRef: any, body: any, statusCode?: number) => {
            if (statusCode) {
              responseRef.status(statusCode);
            }
            if (isNil(body)) {
              return responseRef.send();
            }
            return isObject(body)
              ? responseRef.json(body)
              : responseRef.send(String(body));
          },
        );
      });
      describe('nil', () => {
        it('should call send()', async () => {
          const value = null;
          await routerResponseController.apply(value, response, 200);
          expect(response.send).toHaveBeenCalled();
        });
      });
      describe('string', () => {
        it('should call send(value)', async () => {
          const value = 'string';
          await routerResponseController.apply(value, response, 200);
          expect(response.send).toHaveBeenCalled();
          expect(response.send).toHaveBeenCalledWith(String(value));
        });
      });
      describe('object', () => {
        it('should call json(value)', async () => {
          const value = { test: 'test' };
          await routerResponseController.apply(value, response, 200);
          expect(response.json).toHaveBeenCalled();
          expect(response.json).toHaveBeenCalledWith(value);
        });
      });
    });
  });

  describe('transformToResult', () => {
    describe('when resultOrDeferred', () => {
      describe('is Promise', () => {
        it('should return Promise that resolves to the value resolved by the input Promise', async () => {
          const value = 100;
          expect(
            await routerResponseController.transformToResult(
              Promise.resolve(value),
            ),
          ).toBe(value);
        });
      });

      describe('is Observable', () => {
        it('should return toPromise', async () => {
          const lastValue = 100;
          expect(
            await routerResponseController.transformToResult(
              of(1, 2, 3, lastValue),
            ),
          ).toBe(lastValue);
        });
      });

      describe('is an object that has the method `subscribe`', () => {
        it('should return a Promise that resolves to the input value', async () => {
          const value = { subscribe() {} };
          expect(await routerResponseController.transformToResult(value)).toBe(
            value,
          );
        });
      });

      describe('is an ordinary value', () => {
        it('should return a Promise that resolves to the input value', async () => {
          const value = 100;
          expect(await routerResponseController.transformToResult(value)).toBe(
            value,
          );
        });
      });
    });
  });

  describe('getStatusByMethod', () => {
    it('should return 201 for POST', () => {
      expect(
        routerResponseController.getStatusByMethod(RequestMethod.POST),
      ).toEqual(201);
    });

    const methods = (Object.values(RequestMethod) as unknown[]).filter(
      (value): value is RequestMethod => typeof value === 'number',
    );

    methods
      .filter(method => method !== RequestMethod.POST)
      .forEach(method => {
        it(`should return 200 for ${RequestMethod[method]}`, () => {
          expect(routerResponseController.getStatusByMethod(method)).toEqual(
            200,
          );
        });
      });
  });

  describe('render', () => {
    beforeEach(() => {
      vi.spyOn(adapter, 'render').mockImplementation(
        (response, view: string, options: any) => {
          return response.render(view, options);
        },
      );
    });
    it('should call "res.render()" with expected args', async () => {
      const template = 'template';
      const value = 'test';
      const result = Promise.resolve(value);
      const response = { render: vi.fn() };

      await routerResponseController.render(result, response, template);
      expect(response.render).toHaveBeenCalledWith(template, value);
    });
  });

  describe('setHeaders', () => {
    let setHeaderStub: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      setHeaderStub = vi
        .spyOn(adapter, 'setHeader')
        .mockImplementation(() => ({}));
    });

    it('should set all custom headers', () => {
      const response = {};
      const headers = [{ name: 'test', value: 'test_value' }];

      routerResponseController.setHeaders(response, headers);
      expect(setHeaderStub).toHaveBeenCalledWith(
        response,
        headers[0].name,
        headers[0].value,
      );
    });
  });

  describe('status', () => {
    let statusStub: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      statusStub = vi.spyOn(adapter, 'status').mockImplementation(() => ({}));
    });

    it('should set status', () => {
      const response = {};
      const statusCode = 400;

      routerResponseController.setStatus(response, statusCode);
      expect(statusStub).toHaveBeenCalledWith(response, statusCode);
    });
  });

  describe('redirect should HttpServer.redirect', () => {
    it('should transformToResult', async () => {
      const transformToResultSpy = vi
        .spyOn(routerResponseController, 'transformToResult')
        .mockReturnValue(
          Promise.resolve({ statusCode: 123, url: 'redirect url' }),
        );
      const result = {};
      await routerResponseController.redirect(result, null, null!);
      expect(transformToResultSpy.mock.calls[0][0]).toBe(result);
    });
    it('should pass the response to redirect', async () => {
      vi.spyOn(routerResponseController, 'transformToResult').mockReturnValue(
        Promise.resolve({ statusCode: 123, url: 'redirect url' }),
      );
      const redirectSpy = vi.spyOn(adapter, 'redirect');
      const response = {};
      await routerResponseController.redirect(null, response, null!);
      expect(redirectSpy.mock.calls[0][0]).toBe(response);
    });
    describe('status code', () => {
      it('should come from the transformed result if present', async () => {
        vi.spyOn(routerResponseController, 'transformToResult').mockReturnValue(
          Promise.resolve({ statusCode: 123, url: 'redirect url' }),
        );
        const redirectSpy = vi.spyOn(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          statusCode: 999,
          url: 'not form here',
        });
        expect(redirectSpy.mock.calls[0][1]).toEqual(123);
      });
      it('should come from the redirectResponse if not on the transformed result', async () => {
        vi.spyOn(routerResponseController, 'transformToResult').mockReturnValue(
          Promise.resolve({}),
        );
        const redirectSpy = vi.spyOn(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          statusCode: 123,
          url: 'redirect url',
        });
        expect(redirectSpy.mock.calls[0][1]).toEqual(123);
      });
      it('should default to HttpStatus.FOUND', async () => {
        vi.spyOn(routerResponseController, 'transformToResult').mockReturnValue(
          Promise.resolve({}),
        );
        const redirectSpy = vi.spyOn(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          url: 'redirect url',
        });
        expect(redirectSpy.mock.calls[0][1]).toEqual(HttpStatus.FOUND);
      });
    });
    describe('url', () => {
      it('should come from the transformed result if present', async () => {
        vi.spyOn(routerResponseController, 'transformToResult').mockReturnValue(
          Promise.resolve({ statusCode: 123, url: 'redirect url' }),
        );
        const redirectSpy = vi.spyOn(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          url: 'not from here',
        });
        expect(redirectSpy.mock.calls[0][2]).toEqual('redirect url');
      });
      it('should come from the redirectResponse if not on the transformed result', async () => {
        vi.spyOn(routerResponseController, 'transformToResult').mockReturnValue(
          Promise.resolve({}),
        );
        const redirectSpy = vi.spyOn(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          statusCode: 123,
          url: 'redirect url',
        });
        expect(redirectSpy.mock.calls[0][2]).toEqual('redirect url');
      });
    });
  });
  describe('Server-Sent-Events', () => {
    const attachSocket = <T extends Writable>(request: T) =>
      Object.assign(request, {
        socket: Object.assign(new EventEmitter(), {
          setKeepAlive() {},
          setNoDelay() {},
          setTimeout() {},
        }),
      }) as T & { socket: EventEmitter };

    it('should accept only observables', async () => {
      const result = Promise.resolve('test');
      const response = new Writable();
      response._write = () => {};

      const request = new Writable();
      request._write = () => {};

      try {
        await routerResponseController.sse(
          result as unknown as any,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );
      } catch (e) {
        expect(e.message).toEqual(
          'You must return an Observable stream to use Server-Sent Events (SSE).',
        );
      }
    });

    it('should accept Promise<Observable>', async () => {
      class Sink extends Writable {
        private readonly chunks: string[] = [];

        _write(
          chunk: any,
          encoding: string,
          callback: (error?: Error | null) => void,
        ): void {
          this.chunks.push(chunk);
          callback();
        }

        get content() {
          return this.chunks.join('');
        }
      }

      const written = (stream: Writable) =>
        new Promise((resolve, reject) =>
          stream.on('error', reject).on('finish', resolve),
        );

      const result = Promise.resolve(of('test'));
      const response = new Sink();
      const request = attachSocket(new PassThrough());
      await routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );
      request.destroy();
      await written(response);
      expect(response.content).toEqual(
        `
id: 1
data: test

`,
      );
    });

    it('should use custom status code from response', async () => {
      class SinkWithStatusCode extends Writable {
        statusCode = 404;
        writeHead = vi.fn();
        flushHeaders = vi.fn();

        _write(
          chunk: any,
          encoding: string,
          callback: (error?: Error | null) => void,
        ): void {
          callback();
        }
      }

      const result = of('test');
      const response = new SinkWithStatusCode();
      const request = attachSocket(new PassThrough());
      await routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );

      expect(response.writeHead.mock.calls[0][0]).toBe(404);
      request.destroy();
    });

    it('should write string', async () => {
      class Sink extends Writable {
        private readonly chunks: string[] = [];

        _write(
          chunk: any,
          encoding: string,
          callback: (error?: Error | null) => void,
        ): void {
          this.chunks.push(chunk);
          callback();
        }

        get content() {
          return this.chunks.join('');
        }
      }

      const written = (stream: Writable) =>
        new Promise((resolve, reject) =>
          stream.on('error', reject).on('finish', resolve),
        );

      const result = of('test');
      const response = new Sink();
      const request = attachSocket(new PassThrough());
      await routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );
      await written(response);
      expect(response.content).toEqual(
        `
id: 1
data: test

`,
      );
    });

    it('should close on socket close', () =>
      new Promise<void>(done => {
        const result = of('test');
        const response = new Writable();
        response.end = () => done() as any;
        response._write = () => {};

        const request = attachSocket(new Writable());
        request._write = () => {};

        void routerResponseController.sse(
          result,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );
        request.socket.emit('close');
      }));

    it('should not subscribe a Promise<Observable> if socket closes before it resolves', async () => {
      let subscribed = false;
      const teardown = vi.fn();
      const result = new Promise<Observable<string>>(resolve => {
        setTimeout(() => {
          resolve(
            new Observable(() => {
              subscribed = true;
              return teardown;
            }),
          );
        }, 10);
      });
      const response = new Writable();
      const responseEndSpy = vi.fn();
      response.end = responseEndSpy as any;
      response._write = () => {};

      const request = attachSocket(new PassThrough());

      const ssePromise = routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );
      request.socket.emit('close');

      await ssePromise;
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(subscribed).toBe(false);
      expect(teardown).not.toHaveBeenCalled();
      // response.end() is called once explicitly in onClose, and once more by the
      // pipe's auto-end when stream.end() fires — both are correct; we only care
      // that it was called at least once.
      expect(responseEndSpy).toHaveBeenCalled();
      expect(request.socket.listenerCount('close')).toBe(0);
    });

    it('should not subscribe the producer when stream state was initialized before an async SSE observable resolves', async () => {
      let streamState = 'idle';

      const result = new Promise<Observable<string>>(resolve => {
        streamState = 'running';

        setTimeout(() => {
          resolve(
            new Observable(() => () => {
              streamState = 'stopped';
            }),
          );
        }, 10);
      });
      const response = new Writable();
      response.end = vi.fn() as any;
      response._write = () => {};

      const request = attachSocket(new PassThrough());

      const ssePromise = routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );
      request.socket.emit('close');

      await ssePromise;
      await new Promise(resolve => setTimeout(resolve, 20));

      // The producer Observable is never subscribed, so its teardown never runs;
      // handlers that allocate resources during setup should use @SseSignal() instead.
      expect(streamState).toBe('running');
    });

    it('should not write headers or events after the socket closes before an async SSE observable resolves', async () => {
      class SinkWithWriteHead extends Writable {
        private readonly chunks: string[] = [];
        writeHead = vi.fn();
        flushHeaders = vi.fn();

        _write(
          chunk: any,
          encoding: string,
          callback: (error?: Error | null) => void,
        ): void {
          this.chunks.push(String(chunk));
          callback();
        }

        get content() {
          return this.chunks.join('');
        }
      }

      const result = new Promise<Observable<string>>(resolve => {
        setTimeout(() => {
          resolve(
            new Observable(subscriber => {
              subscriber.next('late event');
              subscriber.complete();
            }),
          );
        }, 10);
      });
      const response = new SinkWithWriteHead();
      const responseEndSpy = vi.spyOn(response, 'end');
      const request = attachSocket(new PassThrough());

      const ssePromise = routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );
      request.socket.emit('close');

      await ssePromise;
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(response.writeHead).not.toHaveBeenCalled();
      expect(response.flushHeaders).not.toHaveBeenCalled();
      expect(response.content).toBe('');
      // response.end() is called once explicitly in onClose, and once more by the
      // pipe's auto-end when stream.end() fires — both are correct; we only care
      // that it was called at least once.
      expect(responseEndSpy).toHaveBeenCalled();
      expect(request.socket.listenerCount('close')).toBe(0);
    });

    it('should not subscribe async SSE producer Observable when client disconnects mid-await (interceptor case, issue #17352)', async () => {
      // Simulates: interceptor doing `return next.handle()`, async SSE handler
      // that awaits 50ms before returning the producer Observable, client
      // disconnect during the await.
      const interceptorsConsumer = new InterceptorsConsumer();
      const teardown = vi.fn();
      let subscribed = false;

      const sseHandler = () =>
        new Promise<Observable<never>>(resolve =>
          setTimeout(
            () =>
              resolve(
                new Observable(() => {
                  subscribed = true;
                  return teardown;
                }),
              ),
            50,
          ),
        );

      const passthroughInterceptors = [
        { intercept: (_ctx: any, handler: any) => handler.handle() },
      ];

      // Run through the real interceptor chain — this is what the router does
      // before handing `result` off to `sse()`.
      const result = await interceptorsConsumer.intercept(
        passthroughInterceptors,
        [],
        { constructor: null } as any,
        sseHandler as any,
        sseHandler,
      );

      const response = new Writable();
      const responseEndSpy = vi.fn();
      response.end = responseEndSpy as any;
      response._write = () => {};

      const request = attachSocket(new PassThrough());

      const ssePromise = routerResponseController.sse(
        result as any,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );

      // Wait one macrotask so all pending microtasks flush: the Promise.resolve(result).then(…)
      // callback runs, subscription is set, the interceptor chain's async nextFn() calls resolve,
      // and sseHandler() is invoked (starting the 50ms timer) — but the timer has NOT fired yet.
      // This puts us squarely in the "mid-await" window that issue #17190 describes.
      await new Promise(resolve => setTimeout(resolve, 10));

      // Disconnect while the async handler is still awaiting
      request.socket.emit('close');

      await ssePromise;
      // Allow the async handler's setTimeout to fire
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(subscribed).toBe(false);
      expect(teardown).not.toHaveBeenCalled();
      // response.end() is called once explicitly in onClose, and once more by the
      // pipe's auto-end when stream.end() fires — both are correct; we only care
      // that it was called at least once.
      expect(responseEndSpy).toHaveBeenCalled();
      expect(request.socket.listenerCount('close')).toBe(0);
    });

    it('should abort the per-request SSE AbortSignal when the client disconnects', async () => {
      const result = new Promise<Observable<string>>(resolve => {
        setTimeout(() => {
          resolve(of('late event'));
        }, 10);
      });
      const response = new Writable();
      response.end = vi.fn() as any;
      response._write = () => {};

      const request = attachSocket(new PassThrough());

      const ssePromise = routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );

      const signal = (request as any)[SSE_ABORT_CONTROLLER]?.signal as
        | AbortSignal
        | undefined;
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal!.aborted).toBe(false);

      request.socket.emit('close');
      await ssePromise;

      expect(signal!.aborted).toBe(true);
    });

    it('should remove the close listener after synchronous completion', async () => {
      const result = of('test');
      const response = new Writable();
      response._write = () => {};

      const request = attachSocket(new PassThrough());

      await routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );

      expect(request.socket.listenerCount('close')).toBe(0);
    });

    it('should keep streaming when the request closes after body consumption', async () => {
      class Sink extends Writable {
        private readonly chunks: string[] = [];

        _write(
          chunk: any,
          encoding: string,
          callback: (error?: Error | null) => void,
        ): void {
          this.chunks.push(chunk);
          callback();
        }

        get content() {
          return this.chunks.join('');
        }
      }

      const written = (stream: Writable) =>
        new Promise((resolve, reject) =>
          stream.on('error', reject).on('finish', resolve),
        );

      const result = of('test');
      const response = new Sink();
      const request = attachSocket(new PassThrough());

      const ssePromise = routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );

      request.emit('close');

      await ssePromise;
      await written(response);

      expect(response.content).toEqual(
        `
id: 1
data: test

`,
      );
    });

    it('should close the request when observable completes', () =>
      new Promise<void>(done => {
        const result = of('test');
        const response = new Writable();
        response.end = done as any;
        response._write = () => {};

        const request = new Writable();
        request._write = () => {};

        void routerResponseController.sse(
          result,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );
      }));

    it('should allow to intercept the response', () =>
      new Promise<void>(done => {
        const result = vi.fn();
        const response = new Writable();
        response.end();
        response._write = () => {};

        const request = new Writable();
        request._write = () => {};

        try {
          void routerResponseController.sse(
            result as unknown as Observable<string>,
            response as unknown as ServerResponse,
            request as unknown as IncomingMessage,
          );
        } catch {
          // Whether an error is thrown or not
          // is not relevant, so long as
          // result is not called
        }

        expect(result).not.toHaveBeenCalled();
        done();
      }));

    describe('when writing data too densely', () => {
      const DEFAULT_MAX_LISTENERS = SseStream.defaultMaxListeners;
      const MAX_LISTENERS = 1;

      beforeEach(() => {
        // Can't access to the internal sseStream,
        // as a workaround, set `defaultMaxListeners` of `SseStream` and reset the max listeners of `process`
        const PROCESS_MAX_LISTENERS = process.getMaxListeners();
        SseStream.defaultMaxListeners = MAX_LISTENERS;
        process.setMaxListeners(PROCESS_MAX_LISTENERS);

        const originalWrite = SseStream.prototype.write;
        // Make `.write()` always return false, so as to listen `drain` event
        vi.spyOn(SseStream.prototype, 'write').mockImplementation(function (
          this: any,
          ...args: any[]
        ) {
          originalWrite.apply(this, args);
          return false;
        });
      });

      afterEach(() => {
        vi.restoreAllMocks();
        SseStream.defaultMaxListeners = DEFAULT_MAX_LISTENERS;
      });

      it('should not cause memory leak', async () => {
        let maxDrainListenersExceededWarning = null;
        process.on('warning', (warning: any) => {
          if (
            warning.name === 'MaxListenersExceededWarning' &&
            warning.emitter instanceof SseStream &&
            warning.type === 'drain' &&
            warning.count === MAX_LISTENERS + 1
          ) {
            maxDrainListenersExceededWarning = warning;
          }
        });

        const result = new Subject();

        const response = new Writable();
        response._write = () => {};

        const request = new Writable();
        request._write = () => {};

        void routerResponseController.sse(
          result,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );

        // Send multiple messages simultaneously
        Array.from({ length: MAX_LISTENERS + 1 }).forEach((_, i) =>
          result.next(String(i)),
        );

        await new Promise(resolve => process.nextTick(resolve));

        expect(maxDrainListenersExceededWarning).toBe(null);
      });
    });

    it('should commit headers on next tick without waiting for first emission', async () => {
      class SinkWithWriteHead extends Writable {
        writeHead = vi.fn();
        flushHeaders = vi.fn();

        _write(
          chunk: any,
          encoding: string,
          callback: (error?: Error | null) => void,
        ): void {
          callback();
        }
      }

      const result = new Subject();
      const response = new SinkWithWriteHead();
      const request = new PassThrough();

      void routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );

      // Wait for microtasks (subscription) + macrotask (setTimeout(0))
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(response.writeHead).toHaveBeenCalled();
      expect(response.writeHead.mock.calls[0][0]).toBe(200);

      result.complete();
      request.destroy();
    });

    describe('when there is an error', () => {
      it('should reject when the stream errors before headers are committed', async () => {
        const result = new Subject();
        const response = new Writable();
        response._write = () => {};

        const request = new Writable();
        request._write = () => {};

        const promise = routerResponseController.sse(
          result,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );

        result.error(new Error('Some error'));

        await expect(promise).rejects.toThrow('Some error');
      });

      it('should write the error message to the stream', async () => {
        let resolveFirstChunk: (() => void) | undefined;
        const firstChunkWritten = new Promise<void>(resolve => {
          resolveFirstChunk = resolve;
        });

        class Sink extends Writable {
          private readonly chunks: string[] = [];

          _write(
            chunk: any,
            encoding: string,
            callback: (error?: Error | null) => void,
          ): void {
            this.chunks.push(chunk);
            resolveFirstChunk?.();
            resolveFirstChunk = undefined;
            callback();
          }

          get content() {
            return this.chunks.join('');
          }
        }

        const written = (stream: Writable) =>
          new Promise((resolve, reject) =>
            stream.on('error', reject).on('finish', resolve),
          );

        const result = new Subject();
        const response = new Sink();
        const request = new PassThrough();
        const promise = routerResponseController.sse(
          result,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );

        result.next('hello');
        await firstChunkWritten;
        result.error(new Error('Some error'));
        request.destroy();

        await promise;
        await written(response);
        expect(response.content).toContain('event: error');
        expect(response.content).toContain('data: Some error');
      });
    });
  });
});
