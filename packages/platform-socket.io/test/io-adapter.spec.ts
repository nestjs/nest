import { expect } from 'chai';
import * as sinon from 'sinon';
import { IoAdapter } from '../adapters/io-adapter';
import { EventEmitter } from 'events';
import { config, of } from 'rxjs';

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
