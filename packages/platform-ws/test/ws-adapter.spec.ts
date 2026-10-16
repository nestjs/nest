import { expect } from 'chai';
import { EventEmitter, once } from 'events';
import { createServer } from 'http';
import { AddressInfo, connect } from 'net';
import { config, from, mergeAll, of } from 'rxjs';
import * as sinon from 'sinon';
import { Duplex } from 'stream';
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

        expect(reply.toString()).to.match(/^HTTP\/1\.1 400\r\n/);
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
