import { expect } from 'chai';
import { EventEmitter, once } from 'events';
import { createServer } from 'http';
import { AddressInfo, connect } from 'net';
import { config, from, isObservable, mergeAll, of, Subject } from 'rxjs';
import * as sinon from 'sinon';
import { Duplex } from 'stream';
import { WebSocket, WebSocketServer } from 'ws';
import { WsProxy } from '../../websockets/context/ws-proxy';
import { WsExceptionsHandler } from '../../websockets/exceptions/ws-exceptions-handler';
import { WebSocketsController } from '../../websockets/web-sockets-controller';
import { WsAdapter } from '../adapters/ws-adapter';

describe('WsAdapter', () => {
  describe('bindMessageHandlers', () => {
    const frame = (payload: unknown) => ({ data: JSON.stringify(payload) });
    const bindCountingHandler = (adapter: WsAdapter, client: any) => {
      const counts = { running: 0, maxRunning: 0, handled: [] as number[] };
      adapter.bindMessageHandlers(
        client,
        [
          {
            message: 'test-event',
            methodName: 'handleTestEvent',
            callback: async (data: number) => {
              counts.maxRunning = Math.max(counts.maxRunning, ++counts.running);
              await Promise.resolve();
              counts.running--;
              counts.handled.push(data);
            },
            isAckHandledManually: false,
          },
        ],
        (data: any) => from(data),
      );
      return counts;
    };
    const openClient = () => {
      const client = new EventEmitter() as any;
      client.readyState = 1; // OPEN_STATE
      client.send = sinon.spy();
      return client;
    };

    it('should handle at most "maxConcurrentMessages" messages of a client at once', async () => {
      const client = openClient();
      const counts = bindCountingHandler(
        new WsAdapter(undefined, { maxConcurrentMessages: 2 }),
        client,
      );

      for (let i = 0; i < 5; i++) {
        client.emit('message', frame({ event: 'test-event', data: i }));
      }
      expect(counts.running).to.equal(2);
      await new Promise(resolve => setTimeout(resolve, 5));

      expect(counts.maxRunning).to.equal(2);
      expect(counts.handled).to.deep.equal([0, 1, 2, 3, 4]);
    });

    it('should handle 1000 messages of a client at once by default', () => {
      const client = openClient();
      const counts = bindCountingHandler(new WsAdapter(), client);

      for (let i = 0; i < 1001; i++) {
        client.emit('message', frame({ event: 'test-event', data: i }));
      }

      expect(counts.running).to.equal(1000);
    });

    describe('flow control', () => {
      const pausableClient = () => {
        const client = openClient();
        client.bufferedAmount = 0;
        client.pause = sinon.spy();
        client.resume = sinon.spy();
        client.terminate = sinon.spy(() => (client.readyState = 2)); // CLOSING_STATE
        client.sendCallbacks = [] as Array<() => void>;
        client.send = sinon.spy((_: string, callback: () => void) =>
          client.sendCallbacks.push(callback),
        );
        return client;
      };
      const bindHandler = (
        adapter: WsAdapter,
        client: any,
        callback: (...args: any[]) => any,
      ) =>
        adapter.bindMessageHandlers(
          client,
          [
            {
              message: 'event',
              methodName: 'event',
              callback,
              isAckHandledManually: false,
            },
          ],
          (data: any) => (isObservable(data) ? data : of(data)),
        );
      const waitFor = async (condition: () => boolean, timeout = 2000) => {
        const deadline = Date.now() + timeout;
        while (!condition()) {
          if (Date.now() > deadline) {
            throw new Error('Timed out waiting for the condition');
          }
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      };

      it('should stop reading from a client while replies it has not read pile up', () => {
        const client = pausableClient();
        bindHandler(new WsAdapter(), client, () => 'reply');

        // the client reads nothing, so what is sent to it stays queued
        client.bufferedAmount = 2 * 1024 * 1024;
        client.emit('message', frame({ event: 'event' }));
        client.emit('message', frame({ event: 'event' }));
        expect(client.send.callCount).to.equal(2);
        expect(client.pause.callCount).to.equal(1);

        client.sendCallbacks[0]();
        expect(client.resume.called).to.be.false;

        // the replies are out, whatever else may still be queued
        client.sendCallbacks[1]();
        expect(client.resume.callCount).to.equal(1);
      });

      it('should stop reading from a client while its messages wait for their turn', () => {
        const client = pausableClient();
        const replies: Subject<string>[] = [];
        bindHandler(
          new WsAdapter(undefined, { maxConcurrentMessages: 1 }),
          client,
          () => {
            const reply$ = new Subject<string>();
            replies.push(reply$);
            return reply$;
          },
        );

        client.emit('message', frame({ event: 'event' }));
        expect(client.pause.called).to.be.false;
        client.emit('message', frame({ event: 'event' }));
        expect(client.pause.callCount).to.equal(1);

        replies[0].complete();
        expect(replies).to.have.length(2);
        expect(client.resume.callCount).to.equal(1);
      });

      it('should not read from a client again while another gateway still holds it back', () => {
        const client = pausableClient();
        const adapter = new WsAdapter(undefined, { maxConcurrentMessages: 1 });
        // gateways that share a server each bind their handlers to the client
        const [slowReplies, fastReplies] = [0, 1].map(() => {
          const replies: Subject<string>[] = [];
          bindHandler(adapter, client, () => {
            const reply$ = new Subject<string>();
            replies.push(reply$);
            return reply$;
          });
          return replies;
        });

        client.emit('message', frame({ event: 'event' }));
        client.emit('message', frame({ event: 'event' }));
        expect(client.pause.callCount).to.equal(1);

        // one gateway has caught up, the other still has a message waiting
        fastReplies[0].complete();
        expect(fastReplies).to.have.length(2);
        expect(slowReplies).to.have.length(1);
        expect(client.resume.called).to.be.false;

        slowReplies[0].complete();
        expect(slowReplies).to.have.length(2);
        expect(client.resume.callCount).to.equal(1);

        // and the client can be held back again afterwards
        client.emit('message', frame({ event: 'event' }));
        expect(client.pause.callCount).to.equal(2);
      });

      describe('while it does not read from a client', () => {
        let clock: sinon.SinonFakeTimers;
        // one message at a time, and its handler never replies or completes
        const bindSilentHandler = (client: any) => {
          const replies: Subject<string>[] = [];
          bindHandler(
            new WsAdapter(undefined, { maxConcurrentMessages: 1 }),
            client,
            () => {
              const reply$ = new Subject<string>();
              replies.push(reply$);
              return reply$;
            },
          );
          return replies;
        };
        const pingableClient = () => {
          const client = pausableClient();
          client.ping = sinon.spy();
          return client;
        };

        beforeEach(() => {
          clock = sinon.useFakeTimers();
        });
        afterEach(() => {
          clock.restore();
        });

        it('should ping it every 5 seconds, to find out whether it is still there', () => {
          const client = pingableClient();
          const replies = bindSilentHandler(client);

          client.emit('message', frame({ event: 'event' }));
          clock.tick(10_000);
          expect(client.ping.called).to.be.false;

          client.emit('message', frame({ event: 'event' }));
          expect(client.pause.callCount).to.equal(1);
          clock.tick(10_000);
          expect(client.ping.callCount).to.equal(2);

          // reading resumes
          replies[0].complete();
          expect(client.resume.callCount).to.equal(1);
          clock.tick(10_000);
          expect(client.ping.callCount).to.equal(2);
          expect(clock.countTimers()).to.equal(0);
        });

        it('should not ping a client that has data queued for it', () => {
          const client = pingableClient();
          bindSilentHandler(client);
          client.emit('message', frame({ event: 'event' }));
          client.emit('message', frame({ event: 'event' }));

          client.bufferedAmount = 1;
          clock.tick(5_000);
          expect(client.ping.called).to.be.false;

          client.bufferedAmount = 0;
          clock.tick(5_000);
          expect(client.ping.callCount).to.equal(1);
        });

        it('should stop pinging a client that is closing', () => {
          const client = pingableClient();
          bindSilentHandler(client);
          client.emit('message', frame({ event: 'event' }));
          client.emit('message', frame({ event: 'event' }));

          client.readyState = 2; // CLOSING_STATE
          clock.tick(10_000);
          expect(client.ping.called).to.be.false;
          expect(clock.countTimers()).to.equal(0);
        });

        it('should stop pinging a client that has closed', () => {
          const client = pingableClient();
          bindSilentHandler(client);
          client.emit('message', frame({ event: 'event' }));
          client.emit('message', frame({ event: 'event' }));
          expect(clock.countTimers()).to.equal(1);

          client.emit('close');
          expect(clock.countTimers()).to.equal(0);
        });
      });

      it('should close a client once more than "maxSendBufferSize" bytes are queued for it', () => {
        const client = pausableClient();
        const adapter = new WsAdapter(undefined, { maxSendBufferSize: 1024 });
        const logWarn = sinon.stub(adapter['logger'], 'warn');
        client.send = sinon.spy(
          (payload: string) => (client.bufferedAmount += payload.length),
        );
        bindHandler(adapter, client, () => 'x'.repeat(1024));

        client.emit('message', frame({ event: 'event' }));

        expect(client.terminate.callCount).to.equal(1);
        expect(logWarn.callCount).to.equal(1);
      });

      it('should not handle the messages of a client with more than "maxSendBufferSize" bytes queued', () => {
        const client = pausableClient();
        const callback = sinon.spy();
        const adapter = new WsAdapter(undefined, { maxSendBufferSize: 1024 });
        sinon.stub(adapter['logger'], 'warn');
        bindHandler(adapter, client, callback);

        // e.g. what exception filters sent to a client that reads nothing
        client.bufferedAmount = 1025;
        client.emit('message', frame({ event: 'event' }));

        expect(callback.called).to.be.false;
        expect(client.terminate.callCount).to.equal(1);
      });

      it('should let 128 MB be queued for a client by default', () => {
        const client = pausableClient();
        const callback = sinon.spy();
        const adapter = new WsAdapter();
        sinon.stub(adapter['logger'], 'warn');
        bindHandler(adapter, client, callback);

        client.bufferedAmount = 128 * 1024 * 1024;
        client.emit('message', frame({ event: 'event' }));
        expect(client.terminate.called).to.be.false;

        client.bufferedAmount++;
        client.emit('message', frame({ event: 'event' }));
        expect(callback.callCount).to.equal(1);
        expect(client.terminate.callCount).to.equal(1);
      });

      it('should pace a real client that reads its replies slowly', async () => {
        const adapter = new WsAdapter();
        const server = adapter.create(0, {});
        const reply = 'x'.repeat(64 * 1024);
        server.on('connection', (client: any) =>
          bindHandler(adapter, client, () => reply),
        );
        await once(server, 'listening');
        const connected = once(server, 'connection');
        const client = new WebSocket(`ws://127.0.0.1:${server.address().port}`);
        try {
          await once(client, 'open');
          const [serverClient] = await connected;
          const pause = sinon.spy(serverClient, 'pause');
          const resume = sinon.spy(serverClient, 'resume');

          // 6.4 MB of replies, more than the socket buffers hold
          const count = 100;
          client.pause();
          for (let i = 0; i < count; i++) {
            client.send(JSON.stringify({ event: 'event' }));
          }
          await waitFor(() => pause.called);

          let received = 0;
          client.on('message', () => received++);
          client.resume();
          await waitFor(() => received === count);
          expect(resume.called).to.be.true;
        } finally {
          client.terminate();
          await adapter.close(server);
          await adapter.dispose();
        }
      });
    });

    it('should not let a rejecting handler tear down the message stream', async () => {
      const unhandled: unknown[] = [];
      config.onUnhandledError = err => unhandled.push(err);

      // an app-level @Catch() filter that rethrows
      const exceptionsHandler = new WsExceptionsHandler();
      exceptionsHandler.setCustomFilters([
        {
          exceptionMetatypes: [],
          func: (exception: any) => {
            throw exception;
          },
        },
      ] as any);

      const adapter = new WsAdapter();
      const logError = sinon.stub(adapter['logger'], 'error');

      const client = new EventEmitter() as any;
      client.readyState = 1; // OPEN_STATE
      const replies: any[] = [];
      client.send = (payload: string) => replies.push(JSON.parse(payload));

      let calls = 0;
      const callback = new WsProxy()
        .create(
          async () => {
            if (++calls === 1) throw new Error('handler blew up');
            return 'ok';
          },
          exceptionsHandler,
          'known',
        )
        .bind(undefined, client);

      // same transform WebSocketsController.subscribeMessages passes in
      const realTransform = (data: any) =>
        from(
          WebSocketsController.prototype.pickResult.call(undefined, data),
        ).pipe(mergeAll());

      adapter.bindMessageHandlers(
        client,
        [
          {
            message: 'known',
            methodName: 'm',
            callback,
            isAckHandledManually: false,
          },
        ],
        realTransform,
      );

      client.emit('message', frame({ event: 'known', data: {} }));
      await new Promise(resolve => setTimeout(resolve, 5));
      client.emit('message', frame({ event: 'known', data: {} }));
      await new Promise(resolve => setTimeout(resolve, 5));
      config.onUnhandledError = null;

      expect(calls).to.equal(2);
      expect(replies).to.deep.equal(['ok']);
      expect(unhandled).to.deep.equal([]);
      expect(logError.callCount).to.equal(1);
    });

    it('should not let an unserializable response escape as an uncaught error', async () => {
      const unhandled: unknown[] = [];
      config.onUnhandledError = err => unhandled.push(err);

      const adapter = new WsAdapter();
      const logError = sinon.stub(adapter['logger'], 'error');

      const client = new EventEmitter() as any;
      client.readyState = 1; // OPEN_STATE
      const replies: any[] = [];
      client.send = (payload: string) => replies.push(JSON.parse(payload));

      adapter.bindMessageHandlers(
        client,
        [
          {
            message: 'echo',
            methodName: 'echo',
            callback: ((data: any) => ({ event: 'echo', data })) as any,
            isAckHandledManually: false,
          },
        ],
        (data: any) => of(data),
      );

      // JSON.parse accepts this, JSON.stringify overflows the stack on it
      const depth = 100_000;
      client.emit('message', {
        data: `{"event":"echo","data":${'['.repeat(depth)}${']'.repeat(depth)}}`,
      });
      client.emit('message', frame({ event: 'echo', data: 'ok' }));
      await new Promise(resolve => setTimeout(resolve, 5));
      config.onUnhandledError = null;

      expect(unhandled).to.deep.equal([]);
      expect(logError.callCount).to.equal(1);
      expect(logError.firstCall.args[0]).to.be.instanceOf(RangeError);
      expect(replies).to.deep.equal([{ event: 'echo', data: 'ok' }]);
    });

    it('should not handle messages from a client the server has started closing', () => {
      const adapter = new WsAdapter();
      const client = new EventEmitter() as any;
      client.readyState = 1; // OPEN_STATE
      client.send = sinon.spy();
      const callback = sinon.stub().returns('reply');

      adapter.bindMessageHandlers(
        client,
        [
          {
            message: 'push',
            methodName: 'push',
            callback,
            isAckHandledManually: false,
          },
        ],
        (data: any) => of(data),
      );

      client.emit('message', frame({ event: 'push', data: 1 }));
      // e.g. handleConnection() called client.close(): ws still emits what
      // the client sent before it received the close frame
      client.readyState = 2; // CLOSING_STATE
      client.emit('message', frame({ event: 'push', data: 2 }));

      expect(callback.calledOnceWithExactly(1, 'push')).to.be.true;
      expect(client.send.calledOnce).to.be.true;
    });
  });

  describe('upgrade listener', () => {
    it('should close the socket of an upgrade request whose URL cannot be parsed', async () => {
      const httpServer = createServer();
      const adapter = new WsAdapter(httpServer);
      adapter.create(0, { path: '/live' });
      const upgraded = new Promise<Duplex>(resolve =>
        httpServer.once('upgrade', (_, socket) => resolve(socket)),
      );
      await new Promise<void>(resolve =>
        httpServer.listen(0, '127.0.0.1', resolve),
      );
      const { port } = httpServer.address() as AddressInfo;

      // half-open, so that closing the connection is left to the server
      const client = connect({ port, host: '127.0.0.1', allowHalfOpen: true });
      try {
        client.write(
          'GET /live HTTP/1.1\r\nHost: a b\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n',
        );
        const [reply] = await once(client, 'data');
        const socket = await upgraded;

        expect(reply.toString()).to.equal(
          'HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n',
        );
        // what a client resetting the connection would raise
        expect(() =>
          socket.emit('error', new Error('read ECONNRESET')),
        ).not.to.throw();
        if (!socket.destroyed) {
          await once(socket, 'close');
        }
      } finally {
        client.destroy();
        await adapter.dispose();
        await new Promise(resolve => httpServer.close(resolve));
      }
    });

    it('should leave an upgrade request for another path to the other upgrade listeners', async () => {
      const httpServer = createServer();
      const adapter = new WsAdapter(httpServer);
      adapter.create(0, { path: '/live' });
      // e.g. GraphQL subscriptions served by "graphql-ws" on the same server
      const otherServer = new WebSocketServer({ noServer: true });
      httpServer.on('upgrade', (request, socket, head) => {
        if (request.url === '/graphql') {
          otherServer.handleUpgrade(request, socket, head, ws =>
            otherServer.emit('connection', ws, request),
          );
        }
      });
      await new Promise<void>(resolve =>
        httpServer.listen(0, '127.0.0.1', resolve),
      );
      const { port } = httpServer.address() as AddressInfo;

      const client = new WebSocket(`ws://127.0.0.1:${port}/graphql`);
      try {
        await Promise.race([
          once(client, 'open'),
          once(client, 'error').then(([err]) => Promise.reject(err)),
        ]);
      } finally {
        client.terminate();
        otherServer.clients.forEach(ws => ws.terminate());
        await adapter.dispose();
        await new Promise(resolve => httpServer.close(resolve));
      }
    });

    it('should close the socket of an upgrade request for another path when no other listener can claim it', async () => {
      const httpServer = createServer();
      const adapter = new WsAdapter(httpServer);
      adapter.create(0, { path: '/live' });
      await new Promise<void>(resolve =>
        httpServer.listen(0, '127.0.0.1', resolve),
      );
      const { port } = httpServer.address() as AddressInfo;

      const client = new WebSocket(`ws://127.0.0.1:${port}/unknown`);
      const closed = new Promise(resolve => client.on('close', resolve));
      const failed = new Promise(resolve => client.on('error', resolve));
      try {
        expect(await failed).to.include({ code: 'ECONNRESET' });
        await closed;
      } finally {
        await adapter.dispose();
        await new Promise(resolve => httpServer.close(resolve));
      }
    });

    describe('when another upgrade listener is present', () => {
      let clock: sinon.SinonFakeTimers;
      // bytesWritten is what the connection has already been sent, for example
      // the responses to earlier requests on a keep-alive connection
      const upgrade = (
        bytesWritten: number,
        options?: { unclaimedUpgradeTimeout?: number },
      ) => {
        const httpServer = createServer();
        const adapter = new WsAdapter(httpServer, options);
        adapter.create(0, { path: '/live' });
        // e.g. GraphQL subscriptions, which serve only their own path
        httpServer.on('upgrade', () => undefined);
        const socket = Object.assign(new EventEmitter(), {
          writable: true,
          bytesWritten,
          destroy: sinon.spy(),
        });
        const request = { url: '/unknown', headers: { host: 'localhost' } };
        httpServer.emit('upgrade', request, socket, Buffer.alloc(0));
        return { adapter, socket };
      };

      beforeEach(() => {
        clock = sinon.useFakeTimers();
      });

      afterEach(() => {
        clock.restore();
      });

      it('should close the socket of an upgrade request that no listener claims after a delay', async () => {
        const { adapter, socket } = upgrade(0);

        expect(socket.destroy.called).to.be.false;
        clock.tick(1000);
        expect(socket.destroy.calledOnce).to.be.true;

        await adapter.dispose();
      });

      it('should wait for "unclaimedUpgradeTimeout" before closing an unclaimed socket', async () => {
        const { adapter, socket } = upgrade(0, {
          unclaimedUpgradeTimeout: 5000,
        });

        clock.tick(4999);
        expect(socket.destroy.called).to.be.false;
        clock.tick(1);
        expect(socket.destroy.calledOnce).to.be.true;

        await adapter.dispose();
      });

      it('should leave an unclaimed socket open when "unclaimedUpgradeTimeout" is 0', async () => {
        const { adapter, socket } = upgrade(0, { unclaimedUpgradeTimeout: 0 });

        clock.runAll();
        expect(socket.destroy.called).to.be.false;

        await adapter.dispose();
      });

      it('should keep the socket of an upgrade request that another listener answered', async () => {
        const { adapter, socket } = upgrade(0);
        // the other listener's handshake response
        socket.bytesWritten += 129;

        clock.tick(1000);
        expect(socket.destroy.called).to.be.false;

        await adapter.dispose();
      });

      it('should close an unclaimed socket that arrives with bytes already written', async () => {
        // a keep-alive connection that answered a plain request first
        const { adapter, socket } = upgrade(124);

        clock.tick(1000);
        expect(socket.destroy.calledOnce).to.be.true;

        await adapter.dispose();
      });

      it('should keep an answered socket that arrives with bytes already written', async () => {
        const { adapter, socket } = upgrade(124);
        socket.bytesWritten += 129;

        clock.tick(1000);
        expect(socket.destroy.called).to.be.false;

        await adapter.dispose();
      });
    });
  });

  describe('upgrade hooks', () => {
    const getFreePort = async () => {
      const probe = createServer();
      await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
      const { port } = probe.address() as AddressInfo;
      await new Promise(resolve => probe.close(resolve));
      return port;
    };
    // How the handshake of a client ended: 'open', or the status it got, or
    // 'closed' when the server cut the connection
    const connect = (url: string, protocols?: string[]) =>
      new Promise<'open' | 'closed' | number>(resolve => {
        const client = new WebSocket(url, protocols);
        client.once('open', () => {
          resolve('open');
          client.terminate();
        });
        client.once('unexpected-response', (_, response) => {
          resolve(response.statusCode!);
          response.resume();
          client.terminate();
        });
        client.once('error', () => resolve('closed'));
      });
    let adapter: WsAdapter;
    let logError: sinon.SinonStub;
    let cleanUp: Array<() => Promise<unknown>>;

    beforeEach(() => {
      adapter = new WsAdapter();
      logError = sinon.stub(adapter['logger'], 'error');
      cleanUp = [];
    });
    afterEach(async () => {
      for (const step of cleanUp.reverse()) {
        await step();
      }
      await adapter.dispose();
    });

    // A port of its own, where ws creates the HTTP server and listens for
    // upgrades itself, or the HTTP server of the application
    const layouts = {
      'on a port of its own': async (options: Record<string, any>) => {
        const server = adapter.create(await getFreePort(), options);
        cleanUp.push(() => adapter.close(server));
        await once(server, 'listening');
        return { server, url: `ws://127.0.0.1:${server.address().port}` };
      },
      'on the HTTP server': async (options: Record<string, any>) => {
        const httpServer = createServer();
        adapter = new WsAdapter(httpServer);
        logError = sinon.stub(adapter['logger'], 'error');
        const server = adapter.create(0, { ...options, path: '/live' });
        await new Promise<void>(resolve =>
          httpServer.listen(0, '127.0.0.1', resolve),
        );
        cleanUp.push(
          () => adapter.close(server),
          () => new Promise(resolve => httpServer.close(resolve)),
        );
        const { port } = httpServer.address() as AddressInfo;
        return { server, url: `ws://127.0.0.1:${port}/live` };
      },
    };

    for (const [layout, listen] of Object.entries(layouts)) {
      describe(layout, () => {
        it('should refuse a client with 500 when "verifyClient" throws', async () => {
          const error = new Error('token of another length');
          const { url } = await listen({
            verifyClient: () => {
              throw error;
            },
          });

          expect(await connect(url)).to.equal(500);
          expect(logError.calledWith(error)).to.be.true;
        });

        it('should refuse a client with 500 when the promise of "verifyClient" rejects', async () => {
          const error = new Error('token store unreachable');
          const { url } = await listen({
            verifyClient: (_: unknown, _callback: () => void) =>
              Promise.reject(error),
          });

          expect(await connect(url)).to.equal(500);
          expect(logError.calledWith(error)).to.be.true;
        });

        it('should wait for the promise of a "verifyClient" without a callback', async () => {
          const verdicts = [false, true];
          const { url } = await listen({
            verifyClient: async () => verdicts.shift(),
          });

          expect(await connect(url)).to.equal(401);
          expect(await connect(url)).to.equal('open');
        });

        it('should still accept a client "verifyClient" calls back for', async () => {
          const { url } = await listen({
            verifyClient: (_: unknown, callback: (verified: boolean) => void) =>
              setImmediate(() => callback(true)),
          });

          expect(await connect(url)).to.equal('open');
        });

        it('should cut off a client, and not hand it to the gateway, when "handleProtocols" throws', async () => {
          const error = new Error('unknown protocol');
          const { server, url } = await listen({
            handleProtocols: () => {
              throw error;
            },
          });
          const onConnection = sinon.spy();
          adapter.bindClientConnect(server, onConnection);

          expect(await connect(url, ['chat'])).to.equal('closed');
          expect(logError.calledWith(error)).to.be.true;
          expect(onConnection.called).to.be.false;
        });

        it('should still hand a client to the gateway when "handleProtocols" picks a protocol', async () => {
          const { server, url } = await listen({
            handleProtocols: (protocols: Set<string>) =>
              protocols.values().next().value,
          });
          const onConnection = sinon.spy();
          adapter.bindClientConnect(server, onConnection);

          expect(await connect(url, ['chat'])).to.equal('open');
          expect(onConnection.calledOnce).to.be.true;
        });
      });
    }

    describe('on the HTTP server', () => {
      it('should answer 500 without telling the client what failed', async () => {
        const { server, url } = await layouts['on the HTTP server']({});
        const error = new Error('internal detail');
        server.on('headers', () => {
          throw error;
        });

        expect(await connect(url)).to.equal(500);
        expect(logError.calledWith(error)).to.be.true;
      });

      it('should close a client whose connection failed to be handled', async () => {
        const { server, url } = await layouts['on the HTTP server']({});
        const error = new Error('connection hook blew up');
        server.on('connection', () => {
          throw error;
        });

        const client = new WebSocket(url);
        const [code] = await once(client, 'close');
        expect(code).to.equal(1006);
        expect(logError.calledWith(error)).to.be.true;
      });
    });
  });

  describe('create (own port and path)', () => {
    const getFreePort = async () => {
      const probe = createServer();
      await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
      const { port } = probe.address() as AddressInfo;
      await new Promise(resolve => probe.close(resolve));
      return port;
    };
    let adapter: WsAdapter;
    let port: number;

    beforeEach(async () => {
      adapter = new WsAdapter();
      port = await getFreePort();
    });
    afterEach(() => adapter.dispose());

    it('should answer a request that is not an upgrade with 426', async () => {
      adapter.create(port, { path: '/chat' });
      const httpServer = adapter['httpServersRegistry'].get(port);
      if (!httpServer.listening) {
        await once(httpServer, 'listening');
      }

      const response = await fetch(`http://127.0.0.1:${port}/chat`, {
        signal: AbortSignal.timeout(1000),
      });

      expect(response.status).to.equal(426);
      expect(await response.text()).to.equal('Upgrade Required');
    });

    describe('when gateways share the port', () => {
      let logError: sinon.SinonStub;
      let logWarn: sinon.SinonStub;
      beforeEach(() => {
        logError = sinon.stub(adapter['logger'], 'error');
        logWarn = sinon.stub(adapter['logger'], 'warn');
      });

      it('should refuse a gateway that sets another host than the port listens on', () => {
        adapter.create(port, { path: '/a', host: '127.0.0.1' });

        expect(() =>
          adapter.create(port, { path: '/b', host: '0.0.0.0' }),
        ).to.throw(
          /sets the host "0.0.0.0", but shares port \d+ with gateways that listen on the host "127.0.0.1"/,
        );
        expect(logError.calledOnce).to.be.true;
      });

      it('should refuse a gateway that sets a host on a port that listens on every address', () => {
        adapter.create(port, { path: '/a' });

        expect(() =>
          adapter.create(port, { path: '/b', host: '127.0.0.1' }),
        ).to.throw(/listen on every address/);
      });

      it('should warn about a gateway without a host on a port that listens on one host only', () => {
        adapter.create(port, { path: '/a', host: '127.0.0.1' });

        expect(() => adapter.create(port, { path: '/b' })).not.to.throw();
        expect(logWarn.calledOnce).to.be.true;
      });

      it('should accept gateways that set the same host', () => {
        adapter.create(port, { path: '/a', host: '127.0.0.1' });
        adapter.create(port, { path: '/b', host: '127.0.0.1' });

        expect(logError.called).to.be.false;
        expect(logWarn.called).to.be.false;
      });
    });

    it('should listen on the host from the options', async () => {
      adapter.create(port, { path: '/chat', host: '127.0.0.1' });
      const httpServer = adapter['httpServersRegistry'].get(port);
      if (!httpServer.listening) {
        await once(httpServer, 'listening');
      }

      expect(httpServer.address()).to.include({
        address: '127.0.0.1',
        port,
      });
    });
  });
});
