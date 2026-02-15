import { isNil, isObject } from '@nestjs/common/utils/shared.utils.js';
import { IncomingMessage, ServerResponse } from 'http';
import { Observable, of, Subject } from 'rxjs';
import { PassThrough, Writable } from 'stream';
import { HttpStatus, RequestMethod } from '../../../common/index.js';
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
    describe('when RequestMethod is POST', () => {
      it('should return 201', () => {
        expect(
          routerResponseController.getStatusByMethod(RequestMethod.POST),
        ).toEqual(201);
      });
    });
    describe('when RequestMethod is not POST', () => {
      it('should return 200', () => {
        expect(
          routerResponseController.getStatusByMethod(RequestMethod.GET),
        ).toEqual(200);
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
    it('should accept only observables', async () => {
      const result = Promise.resolve('test');
      try {
        await routerResponseController.sse(
          result as unknown as any,
          {} as unknown as ServerResponse,
          {} as unknown as IncomingMessage,
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
      const request = new PassThrough();
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
      const request = new PassThrough();
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
      const request = new PassThrough();
      void routerResponseController.sse(
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

    it('should close on request close', () =>
      new Promise<void>(done => {
        const result = of('test');
        const response = new Writable();
        response.end = () => done() as any;
        response._write = () => {};

        const request = new Writable();
        request._write = () => {};

        void routerResponseController.sse(
          result,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );
        request.emit('close');
      }));

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

    describe('when there is an error', () => {
      it('should close the request', () =>
        new Promise<void>(done => {
          const result = new Subject();
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

          result.error(new Error('Some error'));
        }));

      it('should write the error message to the stream', async () => {
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

        const result = new Subject();
        const response = new Sink();
        const request = new PassThrough();
        void routerResponseController.sse(
          result,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );

        result.error(new Error('Some error'));
        request.destroy();

        await written(response);
        expect(response.content).toEqual(
          `
event: error
id: 1
data: Some error

`,
        );
      });
    });
  });
});
