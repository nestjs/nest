import { expect } from 'chai';
import { EventEmitter } from 'events';
import { config, from, mergeAll, of } from 'rxjs';
import * as sinon from 'sinon';
import { Namespace, Server } from 'socket.io';
import { WsProxy } from '../../websockets/context/ws-proxy';
import { WsExceptionsHandler } from '../../websockets/exceptions/ws-exceptions-handler';
import { WebSocketsController } from '../../websockets/web-sockets-controller';
import { IoAdapter } from '../adapters/io-adapter';

describe('IoAdapter', () => {
  let adapter: IoAdapter;

  beforeEach(() => {
    adapter = new IoAdapter();
  });

  describe('limits', () => {
    it('should use the defaults for limits that are not numbers', () => {
      const withNaN = new IoAdapter(undefined, {
        maxConcurrentMessages: NaN,
        maxWaitingMessages: NaN,
      });

      for (const key of [
        'maxConcurrentMessages',
        'maxWaitingMessages',
      ] as const) {
        expect(withNaN[key]).to.equal(adapter[key]);
        expect(withNaN[key]).to.be.greaterThan(0);
      }
    });

    it('should keep 0 and Infinity', () => {
      const custom = new IoAdapter(undefined, {
        maxConcurrentMessages: Infinity,
        maxWaitingMessages: 0,
      });

      expect(custom['maxConcurrentMessages']).to.equal(Infinity);
      expect(custom['maxWaitingMessages']).to.equal(0);
    });
  });

  describe('bindMessageHandlers', () => {
    const bindCountingHandler = (adapter: IoAdapter, socket: any) => {
      const counts = { running: 0, maxRunning: 0, handled: [] as number[] };
      adapter.bindMessageHandlers(
        socket,
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

    it('should handle at most "maxConcurrentMessages" messages of an event at once', async () => {
      const socket = new EventEmitter() as any;
      const counts = bindCountingHandler(
        new IoAdapter(undefined, { maxConcurrentMessages: 2 }),
        socket,
      );

      // a polling payload is dispatched before any handler gets to settle
      for (let i = 0; i < 5; i++) {
        socket.emit('test-event', i);
      }
      expect(counts.running).to.equal(2);
      await new Promise(resolve => setTimeout(resolve, 5));

      expect(counts.maxRunning).to.equal(2);
      expect(counts.handled).to.deep.equal([0, 1, 2, 3, 4]);
    });

    it('should handle 1000 messages of an event at once by default', () => {
      const socket = new EventEmitter() as any;
      const counts = bindCountingHandler(adapter, socket);

      for (let i = 0; i < 1001; i++) {
        socket.emit('test-event', i);
      }

      expect(counts.running).to.equal(1000);
    });

    describe('when messages wait for their turn', () => {
      const connectedSocket = () => {
        const socket = new EventEmitter() as any;
        socket.connected = true;
        socket.disconnect = sinon.spy(() => {
          socket.connected = false;
          socket.emit('disconnect', 'server namespace disconnect');
        });
        return socket;
      };
      const bindPendingHandler = (adapter: IoAdapter, socket: any) => {
        const callback = sinon.spy(() => new Promise<never>(() => undefined));
        adapter.bindMessageHandlers(
          socket,
          [
            {
              message: 'test-event',
              methodName: 'handleTestEvent',
              callback,
              isAckHandledManually: false,
            },
          ],
          (data: any) => from(data),
        );
        return callback;
      };

      it('should disconnect a client with more than "maxWaitingMessages" messages of an event waiting', () => {
        const socket = connectedSocket();
        const adapter = new IoAdapter(undefined, {
          maxConcurrentMessages: 1,
          maxWaitingMessages: 2,
        });
        const logWarn = sinon.stub(adapter['logger'], 'warn');
        const callback = bindPendingHandler(adapter, socket);

        for (let i = 0; i < 3; i++) {
          socket.emit('test-event', i);
        }
        expect(socket.disconnect.called).to.be.false;

        socket.emit('test-event', 3);
        expect(socket.disconnect.calledWith(true)).to.be.true;
        expect(logWarn.calledOnce).to.be.true;
        expect(callback.calledOnce).to.be.true;
      });

      it('should let 10000 messages of an event wait by default', () => {
        const socket = connectedSocket();
        bindPendingHandler(adapter, socket);
        sinon.stub(adapter['logger'], 'warn');

        for (let i = 0; i < 1000 + 10000; i++) {
          socket.emit('test-event', i);
        }
        expect(socket.disconnect.called).to.be.false;

        socket.emit('test-event', 'one too many');
        expect(socket.disconnect.calledOnce).to.be.true;
      });

      it('should not let a throwing disconnect hook escape', () => {
        const socket = connectedSocket();
        const error = new Error('disconnect hook blew up');
        socket.disconnect = sinon.spy(() => {
          throw error;
        });
        const adapter = new IoAdapter(undefined, {
          maxConcurrentMessages: 1,
          maxWaitingMessages: 0,
        });
        sinon.stub(adapter['logger'], 'warn');
        const logError = sinon.stub(adapter['logger'], 'error');
        bindPendingHandler(adapter, socket);

        socket.emit('test-event', 0);
        expect(() => socket.emit('test-event', 1)).not.to.throw();
        expect(logError.calledWith(error)).to.be.true;
      });
    });

    describe('when a message refers to the same binary data more than once', () => {
      const bindHandler = (socket: any) => {
        const callback = sinon.spy();
        adapter.bindMessageHandlers(
          socket,
          [
            {
              message: 'upload',
              methodName: 'upload',
              callback,
              isAckHandledManually: false,
            },
          ],
          (data: any) => of(data),
        );
        return callback;
      };
      const connectedSocket = () => {
        const socket = new EventEmitter() as any;
        socket.connected = true;
        socket.disconnect = sinon.spy(() => {
          socket.connected = false;
          socket.emit('disconnect', 'server namespace disconnect');
        });
        return socket;
      };

      it('should disconnect the client without handling the message', () => {
        const socket = connectedSocket();
        const logWarn = sinon.stub(adapter['logger'], 'warn');
        const callback = bindHandler(socket);
        const file = Buffer.from('content');

        socket.emit('upload', { parts: [file, file] });

        expect(callback.called).to.be.false;
        expect(socket.disconnect.calledWith(true)).to.be.true;
        expect(logWarn.calledOnce).to.be.true;
      });

      it('should handle a message with distinct binary values', () => {
        const socket = connectedSocket();
        const callback = bindHandler(socket);

        socket.emit('upload', { parts: [Buffer.from('a'), Buffer.from('a')] });

        expect(callback.calledOnce).to.be.true;
        expect(socket.disconnect.called).to.be.false;
      });
    });

    it('should register only one disconnect listener regardless of call count', () => {
      const addListenerSpy = sinon.spy();
      const fakeSocket = {
        on: addListenerSpy,
        off: sinon.stub(),
        addListener: addListenerSpy,
        removeListener: sinon.stub(),
      } as any;

      const handler = {
        message: 'test-event',
        methodName: 'handleTestEvent',
        callback: sinon.stub().returns({ data: 'response' }),
        isAckHandledManually: false,
      };

      const transform = (data: any) => of(data);

      // Call bindMessageHandlers twice on the same socket
      // (simulates two gateways sharing the same socket)
      adapter.bindMessageHandlers(fakeSocket, [handler], transform);
      adapter.bindMessageHandlers(fakeSocket, [handler], transform);

      const disconnectCalls = addListenerSpy
        .getCalls()
        .filter(call => call.args[0] === 'disconnect');

      expect(disconnectCalls).to.have.lengthOf(1);

      // message handlers should still be registered per call
      const messageCalls = addListenerSpy
        .getCalls()
        .filter(call => call.args[0] === 'test-event');
      expect(messageCalls).to.have.lengthOf(2);
    });

    it('should not let a throwing handler tear down the message stream', () => {
      const socket = new EventEmitter() as any;
      let calls = 0;
      const handler = {
        message: 'test-event',
        methodName: 'handleTestEvent',
        callback: (() => {
          calls++;
          if (calls === 1) {
            throw new Error('handler blew up');
          }
          return { event: 'test-event-reply', data: 'recovered' };
        }) as any,
        isAckHandledManually: false,
      };
      sinon.stub(adapter['logger'], 'error');

      const replies: any[] = [];
      socket.on('test-event-reply', (payload: any) => replies.push(payload));

      adapter.bindMessageHandlers(socket, [handler], (data: any) => of(data));

      socket.emit('test-event', { data: {} });
      socket.emit('test-event', { data: {} });

      expect(calls).to.equal(2);
      expect(replies).to.deep.equal(['recovered']);
    });

    it('should not ack a throwing message but keep acking the next one', () => {
      const socket = new EventEmitter() as any;
      let calls = 0;
      const handler = {
        message: 'test-event',
        methodName: 'handleTestEvent',
        callback: (() => {
          calls++;
          if (calls === 1) {
            throw new Error('handler blew up');
          }
          return { data: 'ok' };
        }) as any,
        isAckHandledManually: false,
      };
      sinon.stub(adapter['logger'], 'error');

      const ack = sinon.spy();
      adapter.bindMessageHandlers(socket, [handler], (data: any) => of(data));

      socket.emit('test-event', [{ a: 1 }, ack]);
      expect(calls).to.equal(1);
      expect(ack.called).to.be.false;

      socket.emit('test-event', [{ a: 1 }, ack]);
      expect(calls).to.equal(2);
      expect(ack.calledOnceWith({ data: 'ok' })).to.be.true;
    });

    it('should not let a rejected handler tear down the message stream', async () => {
      const unhandled: unknown[] = [];
      config.onUnhandledError = err => unhandled.push(err);
      const logError = sinon.stub(adapter['logger'], 'error');

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

      const socket = new EventEmitter() as any;
      const replies: any[] = [];
      socket.on('reply', (payload: any) => replies.push(payload));

      let calls = 0;
      const callback = new WsProxy()
        .create(
          async () => {
            if (++calls === 1) throw new Error('handler blew up');
            return { event: 'reply', data: 'ok' };
          },
          exceptionsHandler,
          'test-event',
        )
        .bind(undefined, socket);

      // same transform WebSocketsController.subscribeMessages passes in
      const transform = (data: any) =>
        from(
          WebSocketsController.prototype.pickResult.call(undefined, data),
        ).pipe(mergeAll());

      adapter.bindMessageHandlers(
        socket,
        [
          {
            message: 'test-event',
            methodName: 'm',
            callback,
            isAckHandledManually: false,
          },
        ],
        transform,
      );

      const flush = () => new Promise(resolve => setTimeout(resolve, 5));
      socket.emit('test-event', {});
      await flush();
      socket.emit('test-event', {});
      await flush();
      config.onUnhandledError = null;

      expect(calls).to.equal(2);
      expect(replies).to.deep.equal(['ok']);
      expect(unhandled).to.deep.equal([]);
      expect(logError.callCount).to.equal(1);
    });

    it('should not let a response the encoder chokes on escape as an uncaught error', async () => {
      const unhandled: unknown[] = [];
      config.onUnhandledError = err => unhandled.push(err);
      const logError = sinon.stub(adapter['logger'], 'error');

      // stands in for socket.io's recursive packet encoder on outbound events
      const socket = new EventEmitter() as any;
      const replies: any[] = [];
      socket.emit = function (event: string, ...args: any[]) {
        if (event === 'echo-reply') {
          replies.push(JSON.parse(JSON.stringify(args[0])));
          return true;
        }
        return EventEmitter.prototype.emit.call(this, event, ...args);
      };

      adapter.bindMessageHandlers(
        socket,
        [
          {
            message: 'echo',
            methodName: 'echo',
            callback: ((data: any) => ({ event: 'echo-reply', data })) as any,
            isAckHandledManually: false,
          },
          {
            message: 'echo-ack',
            methodName: 'echoAck',
            callback: ((data: any) => data) as any,
            isAckHandledManually: false,
          },
        ],
        (data: any) => of(data),
      );

      const depth = 100_000;
      const deep = JSON.parse(`${'['.repeat(depth)}${']'.repeat(depth)}`);
      const ack = sinon.spy((payload: any) => JSON.stringify(payload));

      socket.emit('echo', deep);
      socket.emit('echo', 'ok');
      socket.emit('echo-ack', deep, ack);
      socket.emit('echo-ack', 'ok', ack);
      await new Promise(resolve => setTimeout(resolve, 5));
      config.onUnhandledError = null;

      expect(unhandled).to.deep.equal([]);
      expect(logError.callCount).to.equal(2);
      expect(logError.firstCall.args[0]).to.be.instanceOf(RangeError);
      expect(logError.secondCall.args[0]).to.be.instanceOf(RangeError);
      expect(replies).to.deep.equal(['ok']);
      expect(ack.lastCall.args).to.deep.equal(['ok']);
    });
  });

  describe('createWithoutListener', () => {
    it('should create a server that is not attached to any port', async () => {
      const server = adapter.createWithoutListener() as Server;

      expect(server).to.be.instanceOf(Server);
      expect(server.engine).to.be.undefined;
      expect(server.httpServer).to.be.undefined;
      expect(() => server.emit('broadcast', 'to nobody')).not.to.throw();
      await adapter.close(server);
    });

    it('should create the server through "createIOServer", so that a subclass sets it up', () => {
      const customAdapter = new (class extends IoAdapter {
        public createIOServer(port: number | undefined, options?: any) {
          const server = super.createIOServer(port, options);
          server.use((_, next) => next());
          (server as any).setUp = true;
          return server;
        }
      })();
      const createIOServer = sinon.spy(customAdapter, 'createIOServer');

      const server = customAdapter.createWithoutListener({
        connectTimeout: 1000,
      } as any) as any;

      expect(
        createIOServer.calledWith(
          undefined,
          sinon.match({ connectTimeout: 1000 }),
        ),
      ).to.be.true;
      expect(server.setUp).to.be.true;
    });

    it('should return the namespace a gateway is declared on', () => {
      const namespace = adapter.createWithoutListener({
        namespace: '/chat',
      } as any) as Namespace;

      expect(namespace).to.be.instanceOf(Namespace);
      expect(namespace.name).to.equal('/chat');
    });

    it('should close the adapters of the namespaces of such a server', async () => {
      const server = adapter.createWithoutListener() as Server;
      server.of('/chat');
      const closeAdapters = [...server._nsps.values()].map(namespace =>
        sinon.spy(namespace.adapter, 'close'),
      );

      await adapter.close(server);

      expect(closeAdapters).to.have.length(2);
      closeAdapters.forEach(close => expect(close.calledOnce).to.be.true);
    });
  });
});
