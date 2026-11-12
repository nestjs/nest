import { isNil, isObject } from '@nestjs/common/utils/shared.utils.js';
import { IncomingMessage, ServerResponse } from 'http';
import {
  concat,
  EMPTY,
  from,
  NEVER,
  Observable,
  of,
  Subject,
  throwError,
} from 'rxjs';
import { EventEmitter } from 'events';
import { PassThrough, Writable } from 'stream';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  IntrinsicException,
  Logger,
  NotFoundException,
  type MessageEvent,
  RequestMethod,
  SSE_ABORT_CONTROLLER,
  StreamableFile,
} from '../../../common/index.js';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer.js';
import {
  onceClosed,
  RouterResponseController,
} from '../../router/router-response-controller.js';
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

  describe('stream', () => {
    let reply: ReturnType<typeof vi.fn>;
    let setHeader: ReturnType<typeof vi.fn>;
    let appendHeader: ReturnType<typeof vi.fn>;
    const response = {};
    const request = { method: 'GET', socket: new PassThrough() };

    beforeEach(() => {
      reply = vi.spyOn(adapter, 'reply').mockReturnValue(undefined) as any;
      setHeader = vi.spyOn(adapter, 'setHeader') as any;
      appendHeader = vi.spyOn(adapter, 'appendHeader') as any;
    });

    const repliedFile = (): StreamableFile => reply.mock.calls[0][1];

    async function* generator(...values: unknown[]) {
      yield* values;
    }

    it('should reply with a file of the body, and the status of the handler', async () => {
      await routerResponseController.stream(
        generator('a', 'b'),
        response,
        request,
        { statusCode: 203 },
      );

      expect(reply).toHaveBeenCalledWith(
        response,
        expect.any(StreamableFile),
        203,
      );
      const chunks: unknown[] = [];
      for await (const chunk of repliedFile().getStream()) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual(['a', 'b']);
    });

    it.each<[string, unknown, string]>([
      ['strings', 'a', 'text/plain; charset=utf-8'],
      ['binary data', new Uint8Array(1), 'application/octet-stream'],
      ['objects', { a: 1 }, 'application/x-ndjson'],
    ])('should pick the Content-Type of %s', async (_, chunk, type) => {
      await routerResponseController.stream(
        generator(chunk),
        response,
        request,
      );

      expect(repliedFile().getHeaders().type).toBe(type);
      repliedFile().getStream().destroy();
    });

    it('should use the status and headers of a Response', async () => {
      const headers = new Headers({ 'x-custom': 'yes' });
      headers.append('set-cookie', 'a=1');
      headers.append('set-cookie', 'b=2');

      await routerResponseController.stream(
        new Response('body', { status: 202, headers }),
        response,
        request,
        { statusCode: 200 },
      );

      expect(reply).toHaveBeenCalledWith(
        response,
        expect.any(StreamableFile),
        202,
      );
      expect(setHeader).toHaveBeenCalledWith(response, 'x-custom', 'yes');
      expect(setHeader).not.toHaveBeenCalledWith(
        response,
        'set-cookie',
        expect.anything(),
      );
      expect(appendHeader.mock.calls).toEqual([
        [response, 'Set-Cookie', 'a=1'],
        [response, 'Set-Cookie', 'b=2'],
      ]);
      repliedFile().getStream().destroy();
    });

    it('should reply with no body for a null body', async () => {
      await routerResponseController.stream(
        new Response(null, { status: 204, headers: { 'x-custom': 'yes' } }),
        response,
        request,
      );

      expect(reply).toHaveBeenCalledWith(response, undefined, 204);
      expect(setHeader).toHaveBeenCalledWith(response, 'x-custom', 'yes');
    });

    it('should reply with no body for a body with nothing to send', async () => {
      await routerResponseController.stream(generator(), response, request, {
        statusCode: 200,
      });

      expect(reply).toHaveBeenCalledWith(response, undefined, 200);
    });

    it('should keep the status and headers of a Response with nothing to send', async () => {
      await routerResponseController.stream(
        new Response(new ReadableStream({ start: c => c.close() }), {
          status: 401,
          headers: { 'www-authenticate': 'Bearer' },
        }),
        response,
        request,
        { statusCode: 200 },
      );

      expect(reply).toHaveBeenCalledWith(response, undefined, 401);
      expect(setHeader).toHaveBeenCalledWith(
        response,
        'www-authenticate',
        'Bearer',
      );
    });

    it('should reject and reply nothing for a body that was read', async () => {
      const body = new Response('body');
      await body.text();

      await expect(
        routerResponseController.stream(body, response, request),
      ).rejects.toThrow('has been read already');
      expect(reply).not.toHaveBeenCalled();
    });

    it('should reject and set nothing when the body fails before the first chunk', async () => {
      const failure = new BadRequestException();

      await expect(
        routerResponseController.stream(
          new Response(new ReadableStream({ start: c => c.error(failure) }), {
            headers: { 'x-custom': 'yes' },
          }),
          response,
          request,
        ),
      ).rejects.toBe(failure);
      expect(reply).not.toHaveBeenCalled();
      expect(setHeader).not.toHaveBeenCalled();
    });

    it('should reject and stop the body when the first chunk cannot be serialized', async () => {
      const onFinally = vi.fn();

      await expect(
        routerResponseController.stream(
          (async function* () {
            try {
              yield 1n;
            } finally {
              onFinally();
            }
          })(),
          response,
          request,
        ),
      ).rejects.toThrow(TypeError);
      expect(reply).not.toHaveBeenCalled();
      await vi.waitFor(() => expect(onFinally).toHaveBeenCalledTimes(1));
    });

    it('should stop the body and reject when the adapter refuses a header', async () => {
      const failure = new Error('Invalid character in header content');
      setHeader.mockImplementation(() => {
        throw failure;
      });
      const onCancel = vi.fn();

      await expect(
        routerResponseController.stream(
          new Response(
            new ReadableStream({
              start: controller => controller.enqueue(new Uint8Array(1)),
              cancel: onCancel,
            }),
            { headers: { 'x-custom': 'yes' } },
          ),
          response,
          request,
        ),
      ).rejects.toBe(failure);
      expect(reply).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should stop the body and reject when the adapter cannot reply', async () => {
      const failure = new Error('Invalid character in header content');
      reply.mockImplementation(() => {
        throw failure;
      });
      const onFinally = vi.fn();

      await expect(
        routerResponseController.stream(
          (async function* () {
            try {
              yield 'a';
              yield 'b';
            } finally {
              onFinally();
            }
          })(),
          response,
          request,
        ),
      ).rejects.toBe(failure);
      await vi.waitFor(() => expect(onFinally).toHaveBeenCalledTimes(1));
    });

    describe('for HEAD', () => {
      const head = { method: 'HEAD', socket: new PassThrough() };

      it('should reply with an empty file, without starting the body', async () => {
        const onStart = vi.fn();

        await routerResponseController.stream(
          (async function* () {
            onStart();
            yield 'a';
          })(),
          response,
          head,
          { statusCode: 200 },
        );

        expect(reply).toHaveBeenCalledWith(
          response,
          expect.any(StreamableFile),
          200,
        );
        expect(onStart).not.toHaveBeenCalled();
        const chunks: unknown[] = [];
        for await (const chunk of repliedFile().getStream()) {
          chunks.push(chunk);
        }
        expect(chunks).toEqual([]);
      });

      it('should cancel the body of a Response, and send its headers', async () => {
        const onCancel = vi.fn();

        await routerResponseController.stream(
          new Response(new ReadableStream({ cancel: onCancel }), {
            headers: { 'content-length': '5' },
          }),
          response,
          head,
        );

        expect(setHeader).toHaveBeenCalledWith(response, 'content-length', '5');
        await vi.waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
      });

      it('should read the method of the request a platform wraps', async () => {
        const onStart = vi.fn();

        await routerResponseController.stream(
          (async function* () {
            onStart();
            yield 'a';
          })(),
          response,
          { raw: head },
        );

        expect(onStart).not.toHaveBeenCalled();
      });
    });

    describe('when the client goes away', () => {
      it('should stop waiting for the first chunk, and reply nothing', async () => {
        const socket = new PassThrough();
        const onCancel = vi.fn();
        const sending = routerResponseController.stream(
          new ReadableStream({
            pull: () => new Promise<void>(() => undefined),
            cancel: onCancel,
          }),
          response,
          { method: 'GET', socket },
        );

        socket.destroy();
        await sending;

        expect(reply).not.toHaveBeenCalled();
        expect(onCancel).toHaveBeenCalledTimes(1);
      });

      it('should not start a body for a client that already left', async () => {
        const socket = new PassThrough();
        socket.destroy();
        const onStart = vi.fn();

        await routerResponseController.stream(
          (async function* () {
            onStart();
            yield 'a';
          })(),
          response,
          { method: 'GET', socket },
        );

        expect(onStart).not.toHaveBeenCalled();
        expect(reply).not.toHaveBeenCalled();
      });

      it('should stop listening once the first chunk is there', async () => {
        const socket = new PassThrough();

        await routerResponseController.stream(generator('a'), response, {
          method: 'GET',
          socket,
        });

        expect(socket.listenerCount('close')).toBeLessThanOrEqual(
          new PassThrough().listenerCount('close'),
        );
        repliedFile().getStream().destroy();
      });
    });

    it('should log a failure after the first chunk once', async () => {
      const logged = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      const failure = new Error('upstream failed');

      await routerResponseController.stream(
        (async function* () {
          yield 'a';
          throw failure;
        })(),
        response,
        request,
      );
      const stream = repliedFile().getStream();
      stream.on('data', () => undefined);
      await new Promise(resolve => stream.once('close', resolve));

      expect(logged.mock.calls).toEqual([[failure]]);
      repliedFile().errorLogger(failure);
      expect(logged).toHaveBeenCalledTimes(1);
    });

    it('should not log an IntrinsicException', async () => {
      const logged = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      await routerResponseController.stream(
        (async function* () {
          yield 'a';
          throw new IntrinsicException('expected');
        })(),
        response,
        request,
      );
      const stream = repliedFile().getStream();
      stream.on('data', () => undefined);
      await new Promise(resolve => stream.once('close', resolve));

      expect(logged).not.toHaveBeenCalled();
    });
  });

  describe('onceClosed', () => {
    let source: EventEmitter;

    beforeEach(() => {
      source = new EventEmitter();
    });

    it('should call every callback once the source closes, through one listener', () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];

      callbacks.forEach(callback => onceClosed(source, callback));
      expect(source.listenerCount('close')).toBe(1);

      source.emit('close');
      source.emit('close');

      callbacks.forEach(callback => expect(callback).toHaveBeenCalledTimes(1));
      expect(source.listenerCount('close')).toBe(0);
    });

    it('should not call a callback that stopped waiting', () => {
      const first = vi.fn();
      const second = vi.fn();

      const stopWaiting = onceClosed(source, first);
      onceClosed(source, second);
      stopWaiting();
      stopWaiting();
      expect(source.listenerCount('close')).toBe(1);

      source.emit('close');

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('should leave no listener behind once nothing is waiting', () => {
      const stopWaiting = [vi.fn(), vi.fn()].map(callback =>
        onceClosed(source, callback),
      );

      stopWaiting.forEach(stop => stop());
      expect(source.listenerCount('close')).toBe(0);

      // And wait again for a later request on the same connection
      const callback = vi.fn();
      onceClosed(source, callback);
      source.emit('close');

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should let a callback stop waiting while the source closes', () => {
      const stops: Array<() => void> = [];
      const callbacks = [0, 1, 2].map(index => vi.fn(() => stops[index]()));
      callbacks.forEach(callback => stops.push(onceClosed(source, callback)));

      source.emit('close');

      callbacks.forEach(callback => expect(callback).toHaveBeenCalledTimes(1));
      expect(source.listenerCount('close')).toBe(0);
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
    it('should wait for the reply that HttpServer.redirect returns', async () => {
      // Fastify returns its reply, a thenable that settles once the response
      // is sent. Resolving earlier lets Fastify send the reply a second time.
      let sendReply!: () => void;
      const reply = {
        then: (resolve: () => void) => {
          sendReply = resolve;
        },
      };
      vi.spyOn(adapter, 'redirect').mockReturnValue(reply);
      const redirected = vi.fn();

      const redirect = routerResponseController
        .redirect(null, {}, { url: 'redirect url' })
        .then(redirected);
      await new Promise(resolve => setImmediate(resolve));
      expect(redirected).not.toHaveBeenCalled();

      sendReply();
      await redirect;
      expect(redirected).toHaveBeenCalled();
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

    it.each(['resolve', 'reject'] as const)(
      'should settle a disconnected lifecycle before late setup %s',
      async outcome => {
        let resolveSetup: (value: Observable<never>) => void;
        let rejectSetup: (reason: Error) => void;
        const setup = new Promise<Observable<never>>((resolve, reject) => {
          resolveSetup = resolve;
          rejectSetup = reject;
        });
        const response = new Writable({
          write(_chunk, _encoding, cb) {
            cb();
          },
        });
        const request = attachSocket(new PassThrough());
        const lifecycle = routerResponseController.sse(
          setup,
          response as any,
          request as any,
        );
        request.socket.emit('close');
        const settledBeforeSetup = await Promise.race([
          lifecycle.then(() => true),
          new Promise<boolean>(resolve => setImmediate(() => resolve(false))),
        ]);
        expect(settledBeforeSetup).toBe(true);
        expect((request as any)[SSE_ABORT_CONTROLLER].signal.aborted).toBe(
          true,
        );
        expect(response.writableEnded).toBe(true);
        expect(request.socket.listenerCount('close')).toBe(0);
        const subscribe = vi.fn();
        if (outcome === 'resolve') {
          resolveSetup!(new Observable(subscribe));
        } else {
          rejectSetup!(new Error('late setup rejection'));
        }
        await new Promise(resolve => setImmediate(resolve));
        expect(subscribe).not.toHaveBeenCalled();
        await expect(lifecycle).resolves.toBeUndefined();
      },
    );

    it('should settle without subscribing when the client disconnected before the handler ran', async () => {
      const request = attachSocket(new PassThrough());
      Object.assign(request.socket, { destroyed: true });
      const subscribe = vi.fn();
      const response = new Writable({
        write(_chunk, _encoding, cb) {
          cb();
        },
      });

      await routerResponseController.sse(
        Promise.resolve(new Observable(subscribe)),
        response as any,
        request as any,
      );
      await new Promise(resolve => setImmediate(resolve));

      expect(subscribe).not.toHaveBeenCalled();
      expect((request as any)[SSE_ABORT_CONTROLLER].signal.aborted).toBe(true);
      expect(response.writableEnded).toBe(true);
      expect(request.socket.listenerCount('close')).toBe(0);
    });

    it('should cancel a producer that disconnects synchronously during subscription', async () => {
      const request = attachSocket(new PassThrough());
      const teardown = vi.fn();
      const result = new Observable(() => {
        request.socket.emit('close');
        return teardown;
      });
      const response = new Writable({
        write(_chunk, _encoding, cb) {
          cb();
        },
      });
      const lifecycle = routerResponseController.sse(
        result,
        response as any,
        request as any,
      );
      expect(
        await Promise.race([
          lifecycle.then(() => true),
          new Promise<boolean>(resolve => setImmediate(() => resolve(false))),
        ]),
      ).toBe(true);
      expect(teardown).toHaveBeenCalledOnce();
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

    it('should tolerate a socket without event emitter methods', async () => {
      // Runtimes that emulate "node:http" without a real "net.Socket" (e.g.
      // Cloudflare Workers) expose a socket-like object that only carries
      // address information, so it cannot report a "close" event.
      const chunks: string[] = [];
      const response = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(chunk.toString());
          callback();
        },
      });
      const request = Object.assign(new PassThrough(), {
        socket: { remoteAddress: '127.0.0.1', destroy() {} },
      });

      await expect(
        routerResponseController.sse(
          of('test'),
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        ),
      ).resolves.toBeUndefined();
      expect(chunks.join('')).toContain('data: test');
    });

    it('should observe the response close when the socket cannot report it', async () => {
      const response = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });
      const request = Object.assign(new PassThrough(), {
        socket: { remoteAddress: '127.0.0.1', destroy() {} },
      });
      const subscribe = vi.fn();

      const lifecycle = routerResponseController.sse(
        new Observable(subscribe),
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );

      // Let the producer subscribe, then simulate the client going away.
      await new Promise(resolve => setImmediate(resolve));
      response.emit('close');

      await expect(lifecycle).resolves.toBeUndefined();
      expect(subscribe).toHaveBeenCalledOnce();
      expect((request as any)[SSE_ABORT_CONTROLLER].signal.aborted).toBe(true);
      expect(response.writableEnded).toBe(true);
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

    it('should read the status code from the response when the headers are committed', async () => {
      class SinkWithStatusCode extends Writable {
        statusCode = 200;
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

      const response = new SinkWithStatusCode();
      const result = new Observable<string>(() => {
        response.statusCode = 202;
      });
      const request = attachSocket(new PassThrough());
      const ssePromise = routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );

      await vi.waitFor(() => expect(response.writeHead).toHaveBeenCalled());

      expect(response.writeHead.mock.calls[0][0]).toBe(202);
      request.socket.emit('close');
      await ssePromise;
    });

    it('should read the options when the headers are committed', async () => {
      const writeHead = vi.fn();
      const response = new Writable({
        write(_chunk, _encoding, cb) {
          cb();
        },
      });
      Object.assign(response, { writeHead, flushHeaders: vi.fn() });
      const result = new Subject<string>();
      const request = attachSocket(new PassThrough());
      const replyHeaders: Record<string, string> = {};
      let replyStatus = 200;
      const ssePromise = routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
        {
          additionalHeaders: () => replyHeaders,
          statusCode: () => replyStatus,
        },
      );

      replyHeaders['x-late'] = 'set';
      replyStatus = 202;
      await vi.waitFor(() => expect(writeHead).toHaveBeenCalled());

      expect(writeHead).toHaveBeenCalledWith(
        202,
        expect.objectContaining({ 'x-late': 'set' }),
      );
      result.complete();
      await ssePromise;
    });

    it('should not commit the headers after an observable error', async () => {
      const writeHead = vi.fn();
      const response = new Writable({
        write(_chunk, _encoding, cb) {
          cb();
        },
      });
      // An end that does not end keeps writableEnded false, so only the settled flag stops the timer.
      Object.assign(response, {
        writeHead,
        flushHeaders: vi.fn(),
        end: vi.fn(),
      });
      const request = attachSocket(new PassThrough());
      const failure = new Error('stream failed');

      await expect(
        routerResponseController.sse(
          throwError(() => failure),
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        ),
      ).rejects.toBe(failure);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(writeHead).not.toHaveBeenCalled();
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
        AbortSignal | undefined;
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal!.aborted).toBe(false);

      request.socket.emit('close');
      await ssePromise;

      expect(signal!.aborted).toBe(true);
    });

    it.each([
      { name: 'synchronous', result: EMPTY },
      { name: 'asynchronous', result: Promise.resolve(EMPTY) },
    ])(
      'should commit headers for an empty $name stream',
      async ({ result }) => {
        const response = new Writable({
          write(_chunk, _encoding, cb) {
            cb();
          },
        });
        const writeHead = vi.fn();
        const flushHeaders = vi.fn();
        Object.assign(response, { writeHead, flushHeaders });
        const request = attachSocket(new PassThrough());
        await routerResponseController.sse(
          result,
          response as any,
          request as any,
          {
            additionalHeaders: { 'X-Test': 'empty' },
          },
        );
        await new Promise(resolve => setImmediate(resolve));
        expect(writeHead).toHaveBeenCalledOnce();
        expect(writeHead).toHaveBeenCalledWith(
          200,
          expect.objectContaining({
            'Content-Type': 'text/event-stream',
            'X-Test': 'empty',
          }),
        );
        expect(flushHeaders).toHaveBeenCalledOnce();
        expect(response.writableEnded).toBe(true);
        expect(request.socket.listenerCount('close')).toBe(0);
      },
    );

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

    describe('when the client stops reading', () => {
      // A destination that never accepts a chunk, like the socket of a client
      // that reads nothing
      class StalledSink extends Writable {
        constructor() {
          super({ highWaterMark: 1 });
        }

        _write() {}
      }

      const data = 'x'.repeat(64 * 1024);

      const emitOnSeparateTurns = async (
        producer: Subject<MessageEvent>,
        count: number,
      ) => {
        for (let i = 0; i < count; i++) {
          producer.next({ data });
          await new Promise(resolve => setImmediate(resolve));
        }
      };

      beforeEach(() => {
        vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should drop the connection once too much event data waits for it', async () => {
        const producer = new Subject<MessageEvent>();
        const response = new StalledSink();
        const request = new PassThrough();

        const lifecycle = routerResponseController.sse(
          producer,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );
        // 8M characters, about 2M of which the streams buffer themselves
        await emitOnSeparateTurns(producer, 128);

        expect(response.destroyed).toBe(true);
        await lifecycle;
        expect(producer.observed).toBe(false);
        request.destroy();
      });

      it('should keep the connection while less event data waits for it', async () => {
        const producer = new Subject<MessageEvent>();
        const response = new StalledSink();
        const request = new PassThrough();

        const lifecycle = routerResponseController.sse(
          producer,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );
        await emitOnSeparateTurns(producer, 48);

        expect(response.destroyed).toBe(false);
        expect(producer.observed).toBe(true);
        response.destroy();
        await lifecycle;
        request.destroy();
      });

      it('should drop the connection once more event data than the route allows waits for it', async () => {
        const producer = new Subject<MessageEvent>();
        const response = new StalledSink();
        const request = new PassThrough();

        const lifecycle = routerResponseController.sse(
          producer,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
          { maxPendingDataLength: 1024 },
        );
        // Kept under the default limit
        await emitOnSeparateTurns(producer, 48);

        expect(response.destroyed).toBe(true);
        await lifecycle;
        expect(producer.observed).toBe(false);
        expect(Logger.prototype.warn).toHaveBeenCalledWith(
          expect.stringContaining('exceeds the maximum allowed 1024'),
        );
        request.destroy();
      });

      it.each<MessageEvent>([
        { type: 'changed', data: '' },
        { type: 'changed' },
        { data: '' },
        { comment: '' },
        { retry: 1000 },
        {},
      ])(
        'should drop the connection once too many events without data (%j) wait for it',
        async event => {
          const producer = new Subject<MessageEvent>();
          const response = new StalledSink();
          const request = new PassThrough();

          const lifecycle = routerResponseController.sse(
            producer,
            response as unknown as ServerResponse,
            request as unknown as IncomingMessage,
            { maxPendingDataLength: 1024 },
          );
          for (let i = 0; i < 256; i++) {
            producer.next({ ...event });
            await new Promise(resolve => setImmediate(resolve));
          }

          expect(response.destroyed).toBe(true);
          await lifecycle;
          expect(producer.observed).toBe(false);
          request.destroy();
        },
      );

      it('should keep the connection while fewer events without data wait for it', async () => {
        const producer = new Subject<MessageEvent>();
        const response = new StalledSink();
        const request = new PassThrough();

        const lifecycle = routerResponseController.sse(
          producer,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
          { maxPendingDataLength: 1024 },
        );
        for (let i = 0; i < 48; i++) {
          producer.next({ type: 'changed', data: '' });
          await new Promise(resolve => setImmediate(resolve));
        }

        expect(response.destroyed).toBe(false);
        expect(producer.observed).toBe(true);
        response.destroy();
        await lifecycle;
        request.destroy();
      });

      // Events replayed at once, before the live ones, as a producer does
      // to resume from the id sent on reconnect
      const replayThenEmit = (producer: Subject<MessageEvent>, count: number) =>
        concat(
          Array.from({ length: count }, () => ({ data })),
          producer,
        );

      const turns = async (count: number) => {
        for (let i = 0; i < count; i++) {
          await new Promise(resolve => setImmediate(resolve));
        }
      };

      it('should drop the connection once too much event data, emitted synchronously, waits for it', async () => {
        const producer = new Subject<MessageEvent>();
        const response = new StalledSink();
        const request = new PassThrough();

        const lifecycle = routerResponseController.sse(
          replayThenEmit(producer, 128),
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );
        await turns(128);

        expect(response.destroyed).toBe(true);
        await lifecycle;
        expect(producer.observed).toBe(false);
        request.destroy();
      });

      it('should keep the connection while less event data, emitted synchronously, waits for it', async () => {
        const producer = new Subject<MessageEvent>();
        const response = new StalledSink();
        const request = new PassThrough();

        const lifecycle = routerResponseController.sse(
          replayThenEmit(producer, 48),
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );
        await turns(128);

        expect(response.destroyed).toBe(false);
        expect(producer.observed).toBe(true);
        response.destroy();
        await lifecycle;
        request.destroy();
      });

      it.each([0, Infinity])(
        'should keep the connection when the route lifts the limit with %s',
        async maxPendingDataLength => {
          const producer = new Subject<MessageEvent>();
          const response = new StalledSink();
          const request = new PassThrough();

          const lifecycle = routerResponseController.sse(
            producer,
            response as unknown as ServerResponse,
            request as unknown as IncomingMessage,
            { maxPendingDataLength },
          );
          // Dropped under the default limit
          await emitOnSeparateTurns(producer, 128);

          expect(response.destroyed).toBe(false);
          expect(producer.observed).toBe(true);
          response.destroy();
          await lifecycle;
          request.destroy();
        },
      );
    });

    describe('when many events wait to be written', () => {
      class Sink extends Writable {
        readonly chunks: string[] = [];

        _write(
          chunk: any,
          encoding: string,
          callback: (error?: Error | null) => void,
        ): void {
          this.chunks.push(chunk.toString());
          callback();
        }
      }

      // More than are written in one turn of the event loop
      const count = 5000;
      const replay = () =>
        from(Array.from({ length: count }, (_, i) => ({ data: String(i) })));
      const turn = () => new Promise(resolve => setImmediate(resolve));

      it('should write them in order', async () => {
        const response = new Sink();
        const request = new PassThrough();

        await routerResponseController.sse(
          replay(),
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );
        await vi.waitFor(() => expect(response.writableFinished).toBe(true));

        expect(response.chunks.join('')).toBe(
          '\n' +
            Array.from(
              { length: count },
              (_, i) => `id: ${i + 1}\ndata: ${i}\n\n`,
            ).join(''),
        );
        request.destroy();
      });

      it('should not shift each of them off a queue', async () => {
        // Each shift() moves the events queued behind the one it removes, so
        // writing n events that way takes time quadratic in n.
        // Patched by hand, as vi.spyOn() calls shift() itself
        const events = Array.from({ length: 3 }, (_, i) => ({
          data: String(i),
        }));
        const shift = Array.prototype.shift;
        const shifted: unknown[] = [];
        Array.prototype.shift = function (this: unknown[]) {
          const item = shift.call(this);
          shifted.push(item);
          return item;
        };
        const response = new Sink();
        const request = new PassThrough();
        try {
          await routerResponseController.sse(
            from(events),
            response as unknown as ServerResponse,
            request as unknown as IncomingMessage,
          );
          await vi.waitFor(() => expect(response.writableFinished).toBe(true));
        } finally {
          Array.prototype.shift = shift;
        }

        expect(response.chunks.join('')).toContain('data: 2\n\n');
        expect(shifted.filter(item => events.includes(item as any))).toEqual(
          [],
        );
        request.destroy();
      });

      it('should let the event loop run before the last one is written', async () => {
        const response = new Sink();
        const request = new PassThrough();

        const lifecycle = routerResponseController.sse(
          replay(),
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );
        await turn();
        const writtenInFirstTurn = response.chunks.length;

        expect(writtenInFirstTurn).toBeGreaterThan(0);
        expect(writtenInFirstTurn).toBeLessThan(count);
        await lifecycle;
        request.destroy();
      });

      it('should not fall behind a producer that emits as many on every turn', async () => {
        const producer = new Subject<MessageEvent>();
        const response = new Sink();
        const request = new PassThrough();

        const lifecycle = routerResponseController.sse(
          producer,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );
        let emitted = 0;
        for (let i = 0; i < 16; i++) {
          for (let j = 0; j < count; j++) {
            producer.next({ data: String(emitted++) });
          }
          await turn();
        }
        // The first chunk is the line that follows the headers
        const waiting = emitted - (response.chunks.length - 1);

        expect(waiting).toBeLessThanOrEqual(count);
        producer.complete();
        await lifecycle;
        request.destroy();
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

      // Headers are committed in a macrotask (setTimeout(0)) after subscribing
      await vi.waitFor(() => expect(response.writeHead).toHaveBeenCalled());
      expect(response.writeHead.mock.calls[0][0]).toBe(200);

      result.complete();
      request.destroy();
    });

    it('should end the response to a HEAD request once the headers are committed', async () => {
      const writeHead = vi.fn();
      const response = new Writable({
        write(_chunk, _encoding, cb) {
          cb();
        },
      });
      Object.assign(response, { writeHead, flushHeaders: vi.fn() });
      const request = Object.assign(attachSocket(new PassThrough()), {
        method: 'HEAD',
      });
      const teardown = vi.fn();
      // A producer that never completes, like an interval
      const result = new Observable<string>(() => teardown);

      const ssePromise = routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );

      await vi.waitFor(() => expect(response.writableEnded).toBe(true));
      await ssePromise;

      expect(writeHead).toHaveBeenCalledOnce();
      expect(writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({ 'Content-Type': 'text/event-stream' }),
      );
      expect(teardown).toHaveBeenCalledOnce();
      expect((request as any)[SSE_ABORT_CONTROLLER].signal.aborted).toBe(true);
      expect(request.socket.listenerCount('close')).toBe(0);
    });

    it('should write number and boolean data as JSON', async () => {
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

      const response = new Sink();
      const request = new PassThrough();

      await routerResponseController.sse(
        of(1, { data: 0 }, { data: false }),
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );
      await vi.waitFor(() => expect(response.writableFinished).toBe(true));

      expect(response.content).toBe(
        '\nid: 1\ndata: 1\n\nid: 2\ndata: 0\n\nid: 3\ndata: false\n\n',
      );
      expect(response.writableFinished).toBe(true);
      request.destroy();
    });

    it('should keep the fields of an event implemented as a class with getters', async () => {
      class TypedEvent implements MessageEvent {
        constructor(readonly data: object) {}

        get type() {
          return 'update';
        }
      }

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

      const response = new Sink();
      const request = new PassThrough();

      await routerResponseController.sse(
        of(new TypedEvent({ value: 1 })),
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );
      await vi.waitFor(() =>
        expect(response.content).toBe(
          '\nevent: update\nid: 1\ndata: {"value":1}\n\n',
        ),
      );
      request.destroy();
    });

    describe('when the socket is no longer read from', () => {
      // Node.js does not notice that a client has left while it is not reading
      // from its socket, so "close" never comes on its own
      const openStream = async (
        socket: { paused: boolean },
        {
          result = NEVER,
          httpVersionMajor = 1,
        }: {
          result?: Observable<unknown> | Promise<Observable<unknown>>;
          httpVersionMajor?: number;
        } = {},
      ) => {
        const chunks: string[] = [];
        const response = new Writable({
          write(chunk, _encoding, cb) {
            chunks.push(chunk.toString());
            cb();
          },
        });
        const request = Object.assign(attachSocket(new PassThrough()), {
          httpVersionMajor,
        });
        Object.assign(request.socket, { isPaused: () => socket.paused });
        const lifecycle = routerResponseController.sse(
          result,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );
        // The headers are committed on the next macrotask
        await vi.advanceTimersByTimeAsync(0);
        return { chunks, request, lifecycle };
      };

      const nextProbe = async () => {
        await vi.advanceTimersByTimeAsync(5_000);
        await new Promise(resolve => setImmediate(resolve));
      };

      beforeEach(() => {
        vi.useFakeTimers({
          toFake: [
            'setTimeout',
            'clearTimeout',
            'setInterval',
            'clearInterval',
          ],
        });
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should write a comment from time to time, to find out whether the client is still there', async () => {
        const socket = { paused: true };
        const { chunks, request, lifecycle } = await openStream(socket);

        await nextProbe();
        expect(chunks).toEqual(['\n', ': \n\n']);
        await nextProbe();
        expect(chunks).toEqual(['\n', ': \n\n', ': \n\n']);

        socket.paused = false;
        await nextProbe();
        expect(chunks).toHaveLength(3);

        request.socket.emit('close');
        await lifecycle;
        request.destroy();
      });

      it('should write nothing to a socket that is read from', async () => {
        const { chunks, request, lifecycle } = await openStream({
          paused: false,
        });

        await nextProbe();
        expect(chunks).toEqual(['\n']);

        request.socket.emit('close');
        await lifecycle;
        request.destroy();
      });

      it('should write nothing before the headers are sent, while a filter can still answer', async () => {
        let resolveResult!: (result: Observable<unknown>) => void;
        const { chunks, request, lifecycle } = await openStream(
          { paused: true },
          { result: new Promise(resolve => (resolveResult = resolve)) },
        );

        await nextProbe();
        expect(chunks).toEqual([]);

        resolveResult(NEVER);
        await vi.advanceTimersByTimeAsync(0);
        await new Promise(resolve => setImmediate(resolve));
        expect(chunks).toEqual(['\n']);

        request.socket.emit('close');
        await lifecycle;
        request.destroy();
      });

      it('should write nothing under HTTP/2, where the socket is that of the whole session', async () => {
        const { chunks, request, lifecycle } = await openStream(
          { paused: true },
          { httpVersionMajor: 2 },
        );

        await nextProbe();
        expect(chunks).toEqual(['\n']);

        request.socket.emit('close');
        await lifecycle;
        request.destroy();
      });

      it('should stop once the stream is over', async () => {
        const { chunks, request, lifecycle } = await openStream({
          paused: true,
        });

        request.socket.emit('close');
        await lifecycle;
        expect(vi.getTimerCount()).toBe(0);
        await nextProbe();
        expect(chunks).toEqual(['\n']);
        request.destroy();
      });
    });

    describe('when there is an error', () => {
      let loggerErrorSpy: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        loggerErrorSpy = vi
          .spyOn(Logger.prototype, 'error')
          .mockImplementation(() => {});
      });

      afterEach(() => {
        loggerErrorSpy.mockRestore();
      });

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

      it.each([
        ['the stream errors', () => throwError(() => new Error('Some error'))],
        [
          'the result throws once piped',
          () => Promise.resolve({ subscribe() {}, lift() {} }),
        ],
      ])(
        'should leave the response to the exception filters when %s before headers are committed',
        async (_, createResult) => {
          const response = new Writable({
            write(_chunk, _encoding, callback) {
              callback();
            },
          });
          const request = new PassThrough();

          await expect(
            routerResponseController.sse(
              createResult() as any,
              response as unknown as ServerResponse,
              request as unknown as IncomingMessage,
            ),
          ).rejects.toThrow();
          // A filter that awaits I/O answers on a later turn of the event
          // loop, and can only do so while the response is still open.
          await new Promise(resolve => setImmediate(resolve));
          await new Promise(resolve => setImmediate(resolve));

          expect(response.writableEnded).toBe(false);
          request.destroy();
        },
      );

      describe('when the headers cannot be written', () => {
        // Node validates header values in writeHead(), which Fastify calls
        // with the headers set on the reply, e.g. one taken from a query param
        class SinkWithInvalidHeader extends Writable {
          readonly error = Object.assign(
            new TypeError('Invalid character in header content ["x-query"]'),
            { code: 'ERR_INVALID_CHAR' },
          );
          writeHead = vi.fn(() => {
            throw this.error;
          });

          _write(
            chunk: any,
            encoding: string,
            callback: (error?: Error | null) => void,
          ): void {
            callback();
          }
        }

        it.each([
          ['when they are committed after subscribing', () => NEVER],
          ['when the producer completes without emitting', () => EMPTY],
          ['with the first event', () => of({ data: 'hello' })],
        ])('should reject %s', async (_, createProducer) => {
          const teardown = vi.fn();
          const producer = new Observable(subscriber => {
            const subscription = createProducer().subscribe(subscriber);
            return () => {
              subscription.unsubscribe();
              teardown();
            };
          });
          const response = new SinkWithInvalidHeader();
          const request = new PassThrough();

          await expect(
            routerResponseController.sse(
              producer,
              response as unknown as ServerResponse,
              request as unknown as IncomingMessage,
            ),
          ).rejects.toBe(response.error);
          await new Promise(resolve => setImmediate(resolve));

          expect(teardown).toHaveBeenCalledTimes(1);
          expect(response.writableEnded).toBe(false);
          expect((request as any)[SSE_ABORT_CONTROLLER].signal.aborted).toBe(
            true,
          );
          request.destroy();
        });
      });

      // The headers are out, so no exception filter can answer anymore
      it.each([
        [
          'an HttpException',
          new BadRequestException('Some error'),
          'Some error',
        ],
        [
          'an HttpException that wraps an Error',
          new InternalServerErrorException(new Error('10.1.2.3:5432')),
          'Internal Server Error',
        ],
        [
          'an HttpException with a status of its own that wraps an Error',
          new HttpException(new Error('/srv/orders/404.json'), 599),
          'Error',
        ],
        [
          'an HttpException that wraps an Error as its cause',
          new NotFoundException('No such job', { cause: new Error('cause') }),
          'No such job',
        ],
        [
          'an "http-errors" error',
          Object.assign(new Error('Some error'), {
            status: 404,
            statusCode: 404,
            expose: true,
          }),
          'Some error',
        ],
        [
          'an "http-errors" error that must not be exposed',
          Object.assign(new Error('Some error'), {
            status: 404,
            statusCode: 404,
            expose: false,
          }),
          'Not Found',
        ],
        [
          'a 5xx "http-errors" error',
          Object.assign(new Error('Some error'), {
            status: 502,
            statusCode: 502,
            expose: false,
          }),
          'Bad Gateway',
        ],
        [
          'an http error-shaped value',
          { statusCode: 404, message: 'Some error' },
          'Some error',
        ],
        ['an Error', new Error('Some error'), 'Internal server error'],
        ['a string', 'Some error', 'Internal server error'],
        [
          'an IntrinsicException',
          new IntrinsicException('Some error'),
          'Internal server error',
        ],
      ])(
        'should write the message BaseExceptionFilter would send for %s',
        async (_, error, expectedData) => {
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
          result.error(error);
          request.destroy();

          await promise;
          await written(response);
          expect(response.content).toContain('event: error');
          expect(response.content).toContain(`data: ${expectedData}\n`);
          if (expectedData !== 'Some error') {
            expect(response.content).not.toContain('Some error');
          }
          if (error instanceof IntrinsicException) {
            expect(loggerErrorSpy).not.toHaveBeenCalled();
          } else {
            expect(loggerErrorSpy).toHaveBeenCalledWith(error);
          }
        },
      );

      it('should write an error event and end the stream when a message cannot be serialized', async () => {
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

        const result = new Subject();
        const response = new Sink();
        const request = new PassThrough();
        const promise = routerResponseController.sse(
          result,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );
        await new Promise(resolve => setTimeout(resolve, 10));

        result.next({ data: { value: 1n } });
        result.next({ data: 'after' });
        await promise;
        await vi.waitFor(() => expect(response.writableFinished).toBe(true));

        expect(response.content).toContain('event: error');
        expect(response.content).toContain('data: Internal server error');
        expect(response.content).not.toContain('data: after');
        expect(response.writableFinished).toBe(true);
        request.destroy();
      });

      it('should write an error event and end the stream when a message field cannot be serialized', async () => {
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

        const result = new Subject();
        const response = new Sink();
        const request = new PassThrough();
        const promise = routerResponseController.sse(
          result,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );
        await new Promise(resolve => setTimeout(resolve, 10));

        result.next({ data: 'before' });
        result.next({ comment: 5 });
        result.next({ data: 'after' });
        await promise;
        await vi.waitFor(() => expect(response.writableFinished).toBe(true));

        expect(response.content).toContain('data: before');
        expect(response.content).toContain('event: error');
        expect(response.content).not.toContain('data: after');
        expect(response.writableFinished).toBe(true);
        request.destroy();
      });

      it('should reject when the first message has a field that cannot be serialized', async () => {
        const response = new Writable();
        response._write = () => {};
        const request = new PassThrough();

        await expect(
          routerResponseController.sse(
            of({ comment: 5 }),
            response as unknown as ServerResponse,
            request as unknown as IncomingMessage,
          ),
        ).rejects.toThrow(TypeError);
        request.destroy();
      });

      it('should reject when the first message cannot be serialized before headers are committed', async () => {
        const response = new Writable();
        response._write = () => {};
        const request = new PassThrough();

        const circular: Record<string, unknown> = {};
        circular.self = circular;

        await expect(
          routerResponseController.sse(
            of({ data: circular }),
            response as unknown as ServerResponse,
            request as unknown as IncomingMessage,
          ),
        ).rejects.toThrow(TypeError);
        request.destroy();
      });

      describe('when the teardown of the producer throws', () => {
        // Unsubscribing rethrows what the teardown throws, in a socket event
        // or a timer, where nothing but the process would catch it.
        const teardownError = new Error('Teardown error');
        const createResponse = () =>
          new Writable({
            write(_chunk, _encoding, callback) {
              callback();
            },
          });

        it('should log the error and end the response when the client disconnects', async () => {
          const response = createResponse();
          const request = attachSocket(new PassThrough());
          const result = new Observable<string>(() => () => {
            throw teardownError;
          });

          const ssePromise = routerResponseController.sse(
            result,
            response as unknown as ServerResponse,
            request as unknown as IncomingMessage,
          );
          // Once the producer is subscribed to
          await new Promise(resolve => setImmediate(resolve));

          expect(() => request.socket.emit('close')).not.toThrow();
          await ssePromise;

          expect(response.writableEnded).toBe(true);
          expect(loggerErrorSpy).toHaveBeenCalledOnce();
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ errors: [teardownError] }),
          );
        });

        it('should log the error and end the response to a HEAD request', async () => {
          const response = createResponse();
          const request = Object.assign(attachSocket(new PassThrough()), {
            method: 'HEAD',
          });
          const result = new Observable<string>(() => () => {
            throw teardownError;
          });

          await routerResponseController.sse(
            result,
            response as unknown as ServerResponse,
            request as unknown as IncomingMessage,
          );

          expect(response.writableEnded).toBe(true);
          expect(loggerErrorSpy).toHaveBeenCalledOnce();
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ errors: [teardownError] }),
          );
        });

        it('should log the error and reject with the error of the producer', async () => {
          const response = createResponse();
          const request = new PassThrough();
          const result = new Observable<string>(subscriber => {
            queueMicrotask(() => subscriber.error(new Error('Some error')));
            return () => {
              throw teardownError;
            };
          });

          await expect(
            routerResponseController.sse(
              result,
              response as unknown as ServerResponse,
              request as unknown as IncomingMessage,
            ),
          ).rejects.toThrow('Some error');

          expect(loggerErrorSpy).toHaveBeenCalledOnce();
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ errors: [teardownError] }),
          );
          request.destroy();
        });

        it('should log the error when the client disconnects synchronously during subscription', async () => {
          const response = createResponse();
          const request = attachSocket(new PassThrough());
          const result = new Observable<string>(() => {
            request.socket.emit('close');
            return () => {
              throw teardownError;
            };
          });

          await routerResponseController.sse(
            result,
            response as unknown as ServerResponse,
            request as unknown as IncomingMessage,
          );
          // Once the producer is subscribed to
          await new Promise(resolve => setImmediate(resolve));

          expect(response.writableEnded).toBe(true);
          expect(loggerErrorSpy).toHaveBeenCalledOnce();
          expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ errors: [teardownError] }),
          );
        });
      });
    });
  });
});
