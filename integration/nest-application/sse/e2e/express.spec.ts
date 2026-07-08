import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { EventSource } from 'eventsource';
import { AppModule } from '../src/app.module';
import {
  fetchInterceptorDelayedSseStats,
  fetchPromiseDelayedSseStats,
  releaseInterceptorDelayedSse,
  releasePromiseDelayedSse,
  waitForInterceptorDelayedSseClose,
  waitForInterceptorDelayedSseRequestStart,
  waitForInterceptorDelayedSseTeardown,
  waitForPromiseDelayedSseClose,
  waitForPromiseDelayedSseRequestStart,
  waitForPromiseDelayedSseTeardown,
} from './utils';

describe('Sse (Express Application)', () => {
  let app: NestExpressApplication;
  let eventSource: EventSource;

  describe('without forceCloseConnections', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestExpressApplication>();
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      await app.listen(3000);
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

    it('receives events from server', done => {
      eventSource.addEventListener('message', event => {
        expect(JSON.parse(event.data)).to.eql({
          hello: 'world',
        });
        done();
      });
    });

    it('returns a validation error status before opening the SSE stream', async () => {
      const response = await fetch(
        `${await app.getUrl()}/sse/validated?limit=invalid`,
        {
          headers: {
            accept: 'text/event-stream',
          },
        },
      );

      expect(response.status).to.equal(400);
      expect(response.headers.get('content-type')).to.contain(
        'application/json',
      );
    });
  });

  describe('with forceCloseConnections', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestExpressApplication>({
        forceCloseConnections: true,
      });
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      await app.listen(3000);
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

    it('receives events from server', done => {
      eventSource.addEventListener('message', event => {
        expect(JSON.parse(event.data)).to.eql({
          hello: 'world',
        });
        done();
      });
    });

    it('returns a validation error status before opening the SSE stream', async () => {
      const response = await fetch(
        `${await app.getUrl()}/sse/validated?limit=invalid`,
        {
          headers: {
            accept: 'text/event-stream',
          },
        },
      );

      expect(response.status).to.equal(400);
      expect(response.headers.get('content-type')).to.contain(
        'application/json',
      );
    });
  });

  describe('backpressure', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestExpressApplication>({
        forceCloseConnections: true,
      });

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

      expect(dataLines).to.have.lengthOf(n);
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

      expect(response.status).to.equal(201);
      expect(response.headers.get('content-type')).to.contain(
        'text/event-stream',
      );
      expect(await response.text()).to.contain('data: {"content":"chunk-0"}');
    });
  });

  describe('Promise<Observable> disconnect handling', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestExpressApplication>({
        forceCloseConnections: true,
      });

      await app.listen(0);
    });

    afterEach(async () => {
      await app.close();
    });

    it('should subscribe and tear down if the GET SSE client disconnects before the promise resolves', async () => {
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
        expect(error.name).to.equal('AbortError');
      });

      await waitForPromiseDelayedSseClose(url);

      expect(await releasePromiseDelayedSse(url)).to.equal(1);

      await waitForPromiseDelayedSseTeardown(url);

      const stats = await fetchPromiseDelayedSseStats(url);
      expect(stats.closeEventsObserved).to.equal(1);
      expect(stats.requestsStarted).to.equal(1);
      expect(stats.runningStreams).to.equal(0);
      expect(stats.subscriptionsStarted).to.equal(1);
      expect(stats.teardownsObserved).to.equal(1);
    });

    it('should subscribe and tear down if the POST SSE client disconnects before the promise resolves', async () => {
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
        expect(error.name).to.equal('AbortError');
      });

      await waitForPromiseDelayedSseClose(url);

      expect(await releasePromiseDelayedSse(url)).to.equal(1);

      await waitForPromiseDelayedSseTeardown(url);

      const stats = await fetchPromiseDelayedSseStats(url);
      expect(stats.closeEventsObserved).to.equal(1);
      expect(stats.requestsStarted).to.equal(1);
      expect(stats.runningStreams).to.equal(0);
      expect(stats.subscriptionsStarted).to.equal(1);
      expect(stats.teardownsObserved).to.equal(1);
    });
  });

  describe('Promise<Observable> disconnect handling with interceptor', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestExpressApplication>({
        forceCloseConnections: true,
      });

      await app.listen(0);
    });

    afterEach(async () => {
      await app.close();
    });

    it('should subscribe and tear down if the GET SSE client disconnects before the promise resolves', async () => {
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
        expect(error.name).to.equal('AbortError');
      });

      await waitForInterceptorDelayedSseClose(url);

      expect(await releaseInterceptorDelayedSse(url)).to.equal(1);

      await waitForInterceptorDelayedSseTeardown(url);

      const stats = await fetchInterceptorDelayedSseStats(url);
      expect(stats.closeEventsObserved).to.equal(1);
      expect(stats.requestsStarted).to.equal(1);
      expect(stats.runningStreams).to.equal(0);
      expect(stats.subscriptionsStarted).to.equal(1);
      expect(stats.teardownsObserved).to.equal(1);
    });

    it('should subscribe and tear down if the POST SSE client disconnects before the promise resolves', async () => {
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
        expect(error.name).to.equal('AbortError');
      });

      await waitForInterceptorDelayedSseClose(url);

      expect(await releaseInterceptorDelayedSse(url)).to.equal(1);

      await waitForInterceptorDelayedSseTeardown(url);

      const stats = await fetchInterceptorDelayedSseStats(url);
      expect(stats.closeEventsObserved).to.equal(1);
      expect(stats.requestsStarted).to.equal(1);
      expect(stats.runningStreams).to.equal(0);
      expect(stats.subscriptionsStarted).to.equal(1);
      expect(stats.teardownsObserved).to.equal(1);
    });
  });
});
