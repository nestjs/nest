import { expect } from 'chai';
import { EventEmitter } from 'events';
import { config, from, mergeAll, of } from 'rxjs';
import * as sinon from 'sinon';
import { WsProxy } from '../../websockets/context/ws-proxy';
import { WsExceptionsHandler } from '../../websockets/exceptions/ws-exceptions-handler';
import { WebSocketsController } from '../../websockets/web-sockets-controller';
import { IoAdapter } from '../adapters/io-adapter';

describe('IoAdapter', () => {
  let adapter: IoAdapter;

  beforeEach(() => {
    adapter = new IoAdapter();
  });

  describe('bindMessageHandlers', () => {
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
});
