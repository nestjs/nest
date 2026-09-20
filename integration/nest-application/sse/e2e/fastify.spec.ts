import { Controller, Get, Module, ValidationPipe } from '@nestjs/common';
import http from 'node:http';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { EventSource } from 'eventsource';
import { AppModule } from '../src/app.module.js';
import {
  fetchInterceptorDelayedSseStats,
  fetchPromiseDelayedSseStats,
  fetchSignalDelayedSseStats,
  releaseInterceptorDelayedSse,
  releasePromiseDelayedSse,
  sleep,
  waitForInterceptorDelayedSseClose,
  waitForInterceptorDelayedSseRequestStart,
  waitForPromiseDelayedSseClose,
  waitForPromiseDelayedSseRequestStart,
  waitForSignalCompletingSseAbort,
  waitForSignalDelayedSseRequestStart,
  waitForSignalDelayedSseResourceCleanup,
  waitForSignalStreamingSseTeardown,
} from './utils.js';

describe('Sse (Fastify Application)', () => {
  let app: NestFastifyApplication;
  let eventSource: EventSource;

  describe('without forceCloseConnections', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      await app.listen(0);
      const url = await app.getUrl();

      eventSource = new EventSource(url + '/sse', {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            headers: {
              ...init?.headers,
              connection: 'keep-alive',
            },
          }),
      });
    });

    // The order of actions is very important here. When not using `forceCloseConnections`,
    // the SSe eventsource should close the connections in order to signal the server that
    // the keep-alive connection can be ended.
    afterEach(async () => {
      eventSource.close();

      await app.close();
    });

    it('receives events from server', () =>
      new Promise<void>(done => {
        eventSource.addEventListener('message', event => {
          expect(JSON.parse(event.data)).toEqual({
            hello: 'world',
          });
          done();
        });
      }));

    it('returns a validation error status before opening the SSE stream', async () => {
      const response = await fetch(
        `${await app.getUrl()}/sse/validated?limit=invalid`,
        {
          headers: {
            accept: 'text/event-stream',
          },
        },
      );

      expect(response.status).toBe(400);
      expect(response.headers.get('content-type')).toContain(
        'application/json',
      );
    });
  });

  describe('with forceCloseConnections', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({
          forceCloseConnections: true,
        }),
      );
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      await app.listen(0);
      const url = await app.getUrl();

      eventSource = new EventSource(url + '/sse', {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            headers: {
              ...init?.headers,
              connection: 'keep-alive',
            },
          }),
      });
    });

    afterEach(async () => {
      await app.close();

      eventSource.close();
    });

    it('receives events from server', () =>
      new Promise<void>(done => {
        eventSource.addEventListener('message', event => {
          expect(JSON.parse(event.data)).toEqual({
            hello: 'world',
          });
          done();
        });
      }));

    it('returns a validation error status before opening the SSE stream', async () => {
      const response = await fetch(
        `${await app.getUrl()}/sse/validated?limit=invalid`,
        {
          headers: {
            accept: 'text/event-stream',
          },
        },
      );

      expect(response.status).toBe(400);
      expect(response.headers.get('content-type')).toContain(
        'application/json',
      );
    });
  });

  describe('backpressure', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({
          forceCloseConnections: true,
        }),
      );

      await app.listen(0);
    });

    afterEach(async () => {
      await app.close();
    });

    it('should deliver all events when bursting large payloads', async () => {
      const url = await app.getUrl();
      const n = 50;
      const size = 65536;

      const response = await fetch(`${url}/sse/burst?n=${n}&size=${size}`);
      const body = await response.text();

      const dataLines = body
        .split('\n')
        .filter(line => line.startsWith('data: '));

      expect(dataLines).toHaveLength(n);
    });

    it('should stream events from POST SSE routes with a request body', async () => {
      const url = await app.getUrl();

      const response = await fetch(`${url}/sse/post`, {
        method: 'POST',
        headers: {
          accept: 'text/event-stream',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ content: 'chunk-0' }),
      });

      expect(response.status).toBe(201);
      expect(response.headers.get('content-type')).toContain(
        'text/event-stream',
      );
      expect(await response.text()).toContain('data: {"content":"chunk-0"}');
    });
  });

  describe('Promise<Observable> disconnect handling', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({
          forceCloseConnections: true,
        }),
      );

      await app.listen(0);
    });

    afterEach(async () => {
      await app.close();
    });

    it('should not subscribe the producer if the GET SSE client disconnects before the promise resolves', async () => {
      const url = await app.getUrl();
      const abortController = new AbortController();
      const responsePromise = fetch(`${url}/sse/promise-delayed`, {
        headers: {
          accept: 'text/event-stream',
        },
        signal: abortController.signal,
      });

      await waitForPromiseDelayedSseRequestStart(url);
      abortController.abort();

      await responsePromise.catch(error => {
        expect(error.name).toBe('AbortError');
      });

      await waitForPromiseDelayedSseClose(url);

      expect(await releasePromiseDelayedSse(url)).toBe(1);

      // Allow the released promise to resolve and the deferred path to run.
      await sleep(0);

      const stats = await fetchPromiseDelayedSseStats(url);
      expect(stats.closeEventsObserved).toBe(1);
      expect(stats.requestsStarted).toBe(1);
      expect(stats.runningStreams).toBe(0);
      expect(stats.subscriptionsStarted).toBe(0);
      expect(stats.teardownsObserved).toBe(0);
    });

    it('should not subscribe the producer if the POST SSE client disconnects before the promise resolves', async () => {
      const url = await app.getUrl();
      const abortController = new AbortController();
      const responsePromise = fetch(`${url}/sse/post/promise-delayed`, {
        method: 'POST',
        headers: {
          accept: 'text/event-stream',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ content: 'chunk-0' }),
        signal: abortController.signal,
      });

      await waitForPromiseDelayedSseRequestStart(url);
      abortController.abort();

      await responsePromise.catch(error => {
        expect(error.name).toBe('AbortError');
      });

      await waitForPromiseDelayedSseClose(url);

      expect(await releasePromiseDelayedSse(url)).toBe(1);

      // Allow the released promise to resolve and the deferred path to run.
      await sleep(0);

      const stats = await fetchPromiseDelayedSseStats(url);
      expect(stats.closeEventsObserved).toBe(1);
      expect(stats.requestsStarted).toBe(1);
      expect(stats.runningStreams).toBe(0);
      expect(stats.subscriptionsStarted).toBe(0);
      expect(stats.teardownsObserved).toBe(0);
    });
  });

  describe('Promise<Observable> disconnect handling with interceptor', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({
          forceCloseConnections: true,
        }),
      );

      await app.listen(0);
    });

    afterEach(async () => {
      await app.close();
    });

    it('should not subscribe the producer if the GET SSE client disconnects before the promise resolves', async () => {
      const url = await app.getUrl();
      const abortController = new AbortController();
      const responsePromise = fetch(`${url}/sse/interceptor/promise-delayed`, {
        headers: {
          accept: 'text/event-stream',
        },
        signal: abortController.signal,
      });

      await waitForInterceptorDelayedSseRequestStart(url);
      abortController.abort();

      await responsePromise.catch(error => {
        expect(error.name).toBe('AbortError');
      });

      await waitForInterceptorDelayedSseClose(url);

      expect(await releaseInterceptorDelayedSse(url)).toBe(1);

      // Allow the released promise to resolve and the deferred path to run.
      await sleep(0);

      const stats = await fetchInterceptorDelayedSseStats(url);
      expect(stats.closeEventsObserved).toBe(1);
      expect(stats.requestsStarted).toBe(1);
      expect(stats.runningStreams).toBe(0);
      expect(stats.subscriptionsStarted).toBe(0);
      expect(stats.teardownsObserved).toBe(0);
    });

    it('should not subscribe the producer if the POST SSE client disconnects before the promise resolves', async () => {
      const url = await app.getUrl();
      const abortController = new AbortController();
      const responsePromise = fetch(
        `${url}/sse/post/interceptor/promise-delayed`,
        {
          method: 'POST',
          headers: {
            accept: 'text/event-stream',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ content: 'chunk-0' }),
          signal: abortController.signal,
        },
      );

      await waitForInterceptorDelayedSseRequestStart(url);
      abortController.abort();

      await responsePromise.catch(error => {
        expect(error.name).toBe('AbortError');
      });

      await waitForInterceptorDelayedSseClose(url);

      expect(await releaseInterceptorDelayedSse(url)).toBe(1);

      // Allow the released promise to resolve and the deferred path to run.
      await sleep(0);

      const stats = await fetchInterceptorDelayedSseStats(url);
      expect(stats.closeEventsObserved).toBe(1);
      expect(stats.requestsStarted).toBe(1);
      expect(stats.runningStreams).toBe(0);
      expect(stats.subscriptionsStarted).toBe(0);
      expect(stats.teardownsObserved).toBe(0);
    });

    it('should clean up setup-phase resources via AbortSignal when the client disconnects mid-await', async () => {
      const url = await app.getUrl();
      const abortController = new AbortController();
      const responsePromise = fetch(`${url}/sse/signal/promise-delayed`, {
        headers: {
          accept: 'text/event-stream',
        },
        signal: abortController.signal,
      });

      await waitForSignalDelayedSseRequestStart(url);
      abortController.abort();

      await responsePromise.catch(error => {
        expect(error.name).toBe('AbortError');
      });

      // The handler's 80ms setup completes after the disconnect; it should
      // observe signal.aborted and clean up the allocated resource itself,
      // without the producer Observable ever being subscribed.
      await waitForSignalDelayedSseResourceCleanup(url);

      const stats = await fetchSignalDelayedSseStats(url);
      expect(stats.requestsStarted).toBe(1);
      expect(stats.resourcesAllocated).toBe(1);
      expect(stats.resourcesCleaned).toBe(1);
      expect(stats.subscriptionsStarted).toBe(0);
    });
  });
  describe('SseSignal lifetime', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({
          forceCloseConnections: true,
        }),
      );

      await app.listen(0);
    });

    afterEach(async () => {
      await app.close();
    });

    it('aborts the signal once a stream that runs to completion has ended', async () => {
      const url = await app.getUrl();

      const response = await fetch(`${url}/sse/signal/completing`, {
        headers: {
          accept: 'text/event-stream',
        },
      });
      const body = await response.text();

      expect(body).toContain('data: {"chunk":0}');
      expect(body).toContain('data: {"chunk":1}');

      // The client never disconnected: the signal is a request-lifetime token,
      // so it aborts because the stream itself ended.
      const stats = await waitForSignalCompletingSseAbort(url);
      expect(stats.subscriptionsStarted).toBe(1);
      expect(stats.teardownsObserved).toBe(1);
      expect(stats.abortsObserved).toBe(1);
    });

    it('aborts the signal when the client disconnects after the producer is subscribed', async () => {
      const url = await app.getUrl();
      const abortController = new AbortController();

      const response = await fetch(`${url}/sse/signal/streaming`, {
        headers: {
          accept: 'text/event-stream',
        },
        signal: abortController.signal,
      });

      // Read until the first event arrives so the producer is definitely
      // subscribed before the client goes away.
      if (!response.body) {
        throw new Error('Expected the SSE response to expose a readable body.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let received = '';

      while (!received.includes('data:')) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        received += decoder.decode(value, { stream: true });
      }

      expect(received).toContain('data:');

      abortController.abort();
      await reader.cancel().catch(() => undefined);

      const stats = await waitForSignalStreamingSseTeardown(url);
      expect(stats.subscriptionsStarted).toBe(1);
      expect(stats.abortsObserved).toBe(1);
      expect(stats.teardownsObserved).toBe(1);
    });
  });

  describe('with NestApplicationOptions.forceCloseConnections', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
        {
          forceCloseConnections: true,
        },
      );
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      await app.listen(0);
      const url = await app.getUrl();

      eventSource = new EventSource(url + '/sse', {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            headers: {
              ...init?.headers,
              connection: 'keep-alive',
            },
          }),
      });
    });

    afterEach(async () => {
      await app.close();

      eventSource.close();
    });

    it('receives events from server', () =>
      new Promise<void>(done => {
        eventSource.addEventListener('message', event => {
          expect(JSON.parse(event.data)).toEqual({
            hello: 'world',
          });
          done();
        });
      }));
  });

  describe('forceCloseConnections closes every listen address', () => {
    let hits = 0;
    let holdApp: NestFastifyApplication;

    @Controller()
    class HoldController {
      @Get('/hold')
      hold() {
        hits += 1;
        return new Promise(() => {});
      }
    }

    @Module({ controllers: [HoldController] })
    class HoldModule {}

    beforeEach(async () => {
      hits = 0;
      const moduleFixture = await Test.createTestingModule({
        imports: [HoldModule],
      }).compile();

      holdApp = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
        { forceCloseConnections: true },
      );
      await holdApp.listen(0);
    });

    afterEach(async () => {
      await holdApp.close();
    });

    it('destroys the in-flight socket of every Fastify bind address', async () => {
      const addresses = holdApp.getHttpAdapter().getInstance().addresses();
      expect(addresses.length).toBeGreaterThan(0);

      const sockets: http.IncomingMessage['socket'][] = [];
      await Promise.all(
        addresses.map(
          (addr: { address: string; family: string; port: number }) =>
            new Promise<void>((resolve, reject) => {
              const req = http.get(
                {
                  hostname: addr.address,
                  port: addr.port,
                  path: '/hold',
                  family: addr.family === 'IPv6' ? 6 : 4,
                },
                () => {},
              );
              req.on('socket', socket => {
                sockets.push(socket);
                resolve();
              });
              req.on('error', err => {
                if (sockets.length === 0) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }),
        ),
      );

      for (let i = 0; i < 50 && hits < addresses.length; i++) {
        await sleep(20);
      }
      expect(hits).toBe(addresses.length);

      await holdApp.close();

      await Promise.all(
        sockets.map(socket =>
          socket.destroyed
            ? Promise.resolve()
            : new Promise<void>((resolve, reject) => {
                const timer = setTimeout(
                  () => reject(new Error('socket was not destroyed')),
                  1500,
                );
                socket.once('close', () => {
                  clearTimeout(timer);
                  resolve();
                });
              }),
        ),
      );
      for (const socket of sockets) {
        expect(socket.destroyed).toBe(true);
      }
    });
  });
});
