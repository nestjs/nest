import { isNil, isObject } from '@nestjs/common/utils/shared.utils';
import { expect } from 'chai';
import { IncomingMessage, ServerResponse } from 'http';
import { Observable, of, Subject } from 'rxjs';
import * as sinon from 'sinon';
import { EventEmitter } from 'events';
import { PassThrough, Writable } from 'stream';
import { HttpStatus, RequestMethod } from '../../../common';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer';
import { RouterResponseController } from '../../router/router-response-controller';
import { SseStream } from '../../router/sse-stream';
import { NoopHttpAdapter } from '../utils/noop-adapter.spec';

describe('RouterResponseController', () => {
  let adapter: NoopHttpAdapter;
  let routerResponseController: RouterResponseController;

  beforeEach(() => {
    adapter = new NoopHttpAdapter({});
    routerResponseController = new RouterResponseController(adapter);
  });

  describe('apply', () => {
    let response: {
      send: sinon.SinonSpy;
      status?: sinon.SinonSpy;
      json: sinon.SinonSpy;
    };
    beforeEach(() => {
      response = { send: sinon.spy(), json: sinon.spy(), status: sinon.spy() };
    });
    describe('when result is', () => {
      beforeEach(() => {
        sinon
          .stub(adapter, 'reply')
          .callsFake((responseRef: any, body: any, statusCode?: number) => {
            if (statusCode) {
              responseRef.status(statusCode);
            }
            if (isNil(body)) {
              return responseRef.send();
            }
            return isObject(body)
              ? responseRef.json(body)
              : responseRef.send(String(body));
          });
      });
      describe('nil', () => {
        it('should call send()', async () => {
          const value = null;
          await routerResponseController.apply(value, response, 200);
          expect(response.send.called).to.be.true;
        });
      });
      describe('string', () => {
        it('should call send(value)', async () => {
          const value = 'string';
          await routerResponseController.apply(value, response, 200);
          expect(response.send.called).to.be.true;
          expect(response.send.calledWith(String(value))).to.be.true;
        });
      });
      describe('object', () => {
        it('should call json(value)', async () => {
          const value = { test: 'test' };
          await routerResponseController.apply(value, response, 200);
          expect(response.json.called).to.be.true;
          expect(response.json.calledWith(value)).to.be.true;
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
          ).to.be.eq(value);
        });
      });

      describe('is Observable', () => {
        it('should return toPromise', async () => {
          const lastValue = 100;
          expect(
            await routerResponseController.transformToResult(
              of(1, 2, 3, lastValue),
            ),
          ).to.be.eq(lastValue);
        });
      });

      describe('is an object that has the method `subscribe`', () => {
        it('should return a Promise that resolves to the input value', async () => {
          const value = { subscribe() {} };
          expect(
            await routerResponseController.transformToResult(value),
          ).to.equal(value);
        });
      });

      describe('is an ordinary value', () => {
        it('should return a Promise that resolves to the input value', async () => {
          const value = 100;
          expect(
            await routerResponseController.transformToResult(value),
          ).to.be.eq(value);
        });
      });
    });
  });

  describe('getStatusByMethod', () => {
    it('should return 201 for POST', () => {
      expect(
        routerResponseController.getStatusByMethod(RequestMethod.POST),
      ).to.be.eql(201);
    });

    const methods = (Object.values(RequestMethod) as unknown[]).filter(
      (value): value is RequestMethod => typeof value === 'number',
    );

    methods
      .filter(method => method !== RequestMethod.POST)
      .forEach(method => {
        it(`should return 200 for ${RequestMethod[method]}`, () => {
          expect(routerResponseController.getStatusByMethod(method)).to.be.eql(
            200,
          );
        });
      });
  });

  describe('render', () => {
    beforeEach(() => {
      sinon
        .stub(adapter, 'render')
        .callsFake((response, view: string, options: any) => {
          return response.render(view, options);
        });
    });
    it('should call "res.render()" with expected args', async () => {
      const template = 'template';
      const value = 'test';
      const result = Promise.resolve(value);
      const response = { render: sinon.spy() };

      await routerResponseController.render(result, response, template);
      expect(response.render.calledWith(template, value)).to.be.true;
    });
  });

  describe('setHeaders', () => {
    let setHeaderStub: sinon.SinonStub;

    beforeEach(() => {
      setHeaderStub = sinon.stub(adapter, 'setHeader').callsFake(() => ({}));
    });

    it('should set all custom headers', () => {
      const response = {};
      const headers = [{ name: 'test', value: 'test_value' }];

      routerResponseController.setHeaders(response, headers);
      expect(
        setHeaderStub.calledWith(response, headers[0].name, headers[0].value),
      ).to.be.true;
    });
  });

  describe('status', () => {
    let statusStub: sinon.SinonStub;

    beforeEach(() => {
      statusStub = sinon.stub(adapter, 'status').callsFake(() => ({}));
    });

    it('should set status', () => {
      const response = {};
      const statusCode = 400;

      routerResponseController.setStatus(response, statusCode);
      expect(statusStub.calledWith(response, statusCode)).to.be.true;
    });
  });

  describe('redirect should HttpServer.redirect', () => {
    it('should transformToResult', async () => {
      const transformToResultSpy = sinon
        .stub(routerResponseController, 'transformToResult')
        .returns(Promise.resolve({ statusCode: 123, url: 'redirect url' }));
      const result = {};
      await routerResponseController.redirect(result, null, null!);
      expect(transformToResultSpy.firstCall.args[0]).to.be.equal(result);
    });
    it('should pass the response to redirect', async () => {
      sinon
        .stub(routerResponseController, 'transformToResult')
        .returns(Promise.resolve({ statusCode: 123, url: 'redirect url' }));
      const redirectSpy = sinon.spy(adapter, 'redirect');
      const response = {};
      await routerResponseController.redirect(null, response, null!);
      expect(redirectSpy.firstCall.args[0]).to.be.equal(response);
    });
    describe('status code', () => {
      it('should come from the transformed result if present', async () => {
        sinon
          .stub(routerResponseController, 'transformToResult')
          .returns(Promise.resolve({ statusCode: 123, url: 'redirect url' }));
        const redirectSpy = sinon.spy(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          statusCode: 999,
          url: 'not form here',
        });
        expect(redirectSpy.firstCall.args[1]).to.be.eql(123);
      });
      it('should come from the redirectResponse if not on the transformed result', async () => {
        sinon
          .stub(routerResponseController, 'transformToResult')
          .returns(Promise.resolve({}));
        const redirectSpy = sinon.spy(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          statusCode: 123,
          url: 'redirect url',
        });
        expect(redirectSpy.firstCall.args[1]).to.be.eql(123);
      });
      it('should default to HttpStatus.FOUND', async () => {
        sinon
          .stub(routerResponseController, 'transformToResult')
          .returns(Promise.resolve({}));
        const redirectSpy = sinon.spy(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          url: 'redirect url',
        });
        expect(redirectSpy.firstCall.args[1]).to.be.eql(HttpStatus.FOUND);
      });
    });
    describe('url', () => {
      it('should come from the transformed result if present', async () => {
        sinon
          .stub(routerResponseController, 'transformToResult')
          .returns(Promise.resolve({ statusCode: 123, url: 'redirect url' }));
        const redirectSpy = sinon.spy(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          url: 'not from here',
        });
        expect(redirectSpy.firstCall.args[2]).to.be.eql('redirect url');
      });
      it('should come from the redirectResponse if not on the transformed result', async () => {
        sinon
          .stub(routerResponseController, 'transformToResult')
          .returns(Promise.resolve({}));
        const redirectSpy = sinon.spy(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          statusCode: 123,
          url: 'redirect url',
        });
        expect(redirectSpy.firstCall.args[2]).to.be.eql('redirect url');
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
        expect.fail('should have thrown');
      } catch (e) {
        expect(e.message).to.eql(
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
      expect(response.content).to.eql(
        `
id: 1
data: test

`,
      );
    });

    it('should use custom status code from response', async () => {
      class SinkWithStatusCode extends Writable {
        statusCode = 404;
        writeHead = sinon.spy();
        flushHeaders = sinon.spy();

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

      expect(response.writeHead.firstCall.args[0]).to.equal(404);
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
      expect(response.content).to.eql(
        `
id: 1
data: test

`,
      );
    });

    it('should close on socket close', done => {
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
    });

    it('should subscribe and teardown a Promise<Observable> if socket closes before it resolves', async () => {
      let subscribed = false;
      const teardown = sinon.spy();
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
      const responseEndSpy = sinon.spy();
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

      expect(subscribed).to.equal(true);
      expect(teardown.calledOnce).to.equal(true);
      expect(responseEndSpy.calledOnce).to.be.true;
      expect(request.socket.listenerCount('close')).to.equal(0);
    });

    it('should tear down stream state initialized before an async SSE observable resolves', async () => {
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
      response.end = sinon.spy() as any;
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

      expect(streamState).to.equal('stopped');
    });

    it('should not write headers or events after the socket closes before an async SSE observable resolves', async () => {
      class SinkWithWriteHead extends Writable {
        private readonly chunks: string[] = [];
        writeHead = sinon.spy();
        flushHeaders = sinon.spy();

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
      const responseEndSpy = sinon.spy(response, 'end');
      const request = attachSocket(new PassThrough());

      const ssePromise = routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );
      request.socket.emit('close');

      await ssePromise;
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(response.writeHead.called).to.equal(false);
      expect(response.flushHeaders.called).to.equal(false);
      expect(response.content).to.equal('');
      expect(responseEndSpy.calledOnce).to.equal(true);
    });

    it('should trigger teardown of async SSE handler Observable when client disconnects mid-await (interceptor case, issue #17190)', async () => {
      // Simulates: interceptor doing `return next.handle()`, async SSE handler
      // that awaits 50ms before returning the producer Observable, client
      // disconnect during the await.
      const interceptorsConsumer = new InterceptorsConsumer();
      const teardown = sinon.spy();
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
      const responseEndSpy = sinon.spy();
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
      // Allow the async handler's setTimeout to fire and teardown path to run
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(subscribed).to.equal(true);
      expect(teardown.calledOnce).to.equal(true);
      // response.end() is called once explicitly in onClose, and once more by the
      // pipe's auto-end when stream.end() fires — both are correct; we only care
      // that it was called at least once.
      expect(responseEndSpy.called).to.be.true;
      expect(request.socket.listenerCount('close')).to.equal(0);
    });

    it('should close the request when observable completes', done => {
      const result = of('test');
      const response = new Writable();
      response.end = done as any;
      response._write = () => {};

      const request = attachSocket(new Writable());
      request._write = () => {};

      void routerResponseController.sse(
        result,
        response as unknown as ServerResponse,
        request as unknown as IncomingMessage,
      );
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

      expect(request.socket.listenerCount('close')).to.equal(0);
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

      expect(response.content).to.eql(
        `
id: 1
data: test

`,
      );
    });

    it('should allow to intercept the response', done => {
      const result = sinon.spy();
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

      sinon.assert.notCalled(result);
      done();
    });

    describe('when writing data too densely', () => {
      const DEFAULT_MAX_LISTENERS = SseStream.defaultMaxListeners;
      const MAX_LISTENERS = 1;
      const sandbox = sinon.createSandbox();

      beforeEach(() => {
        // Can't access to the internal sseStream,
        // as a workaround, set `defaultMaxListeners` of `SseStream` and reset the max listeners of `process`
        const PROCESS_MAX_LISTENERS = process.getMaxListeners();
        SseStream.defaultMaxListeners = MAX_LISTENERS;
        process.setMaxListeners(PROCESS_MAX_LISTENERS);

        const sseStream = sinon.createStubInstance(SseStream);
        const originalWrite = SseStream.prototype.write;
        // Make `.write()` always return false, so as to listen `drain` event
        sseStream.write.callsFake(function (...args: any[]) {
          originalWrite.apply(this, args);
          return false;
        });
        sandbox.replace(SseStream.prototype, 'write', sseStream.write);
      });

      afterEach(() => {
        sandbox.restore();
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

        expect(maxDrainListenersExceededWarning).to.equal(null);
      });
    });

    it('should commit headers on next tick without waiting for first emission', async () => {
      class SinkWithWriteHead extends Writable {
        writeHead = sinon.spy();
        flushHeaders = sinon.spy();

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

      expect(response.writeHead.called).to.be.true;
      expect(response.writeHead.firstCall.args[0]).to.equal(200);

      result.complete();
      request.destroy();
    });

    describe('when there is an error before headers are committed', () => {
      it('should reject the promise so the exception filter can set the status', async () => {
        const result = new Subject();
        const response = new Writable();
        response._write = () => {};

        const request = new Writable();
        request._write = () => {};

        const ssePromise = routerResponseController.sse(
          result,
          response as unknown as ServerResponse,
          request as unknown as IncomingMessage,
        );

        result.error(new Error('Some error'));

        try {
          await ssePromise;
          expect.fail('should have rejected');
        } catch (e) {
          expect(e.message).to.equal('Some error');
        }
      });
    });

    describe('when there is an error after headers are committed', () => {
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

        // Yield so the internal `await Promise.resolve(result)` completes
        // and the subscription is active before we emit.
        await Promise.resolve();

        result.next('first');
        // Let the concatMap inner Promise resolve
        await new Promise(resolve => setTimeout(resolve, 10));
        result.error(new Error('Some error'));
        request.destroy();

        await written(response);
        expect(response.content).to.contain('event: error');
        expect(response.content).to.contain('data: Some error');
      });
    });
  });
});
