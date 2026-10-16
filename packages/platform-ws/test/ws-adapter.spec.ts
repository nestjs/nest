import { expect } from 'chai';
import { EventEmitter } from 'events';
import { config, from, mergeAll, of } from 'rxjs';
import * as sinon from 'sinon';
import { WsProxy } from '../../websockets/context/ws-proxy';
import { WsExceptionsHandler } from '../../websockets/exceptions/ws-exceptions-handler';
import { WebSocketsController } from '../../websockets/web-sockets-controller';
import { WsAdapter } from '../adapters/ws-adapter';

describe('WsAdapter', () => {
  describe('bindMessageHandlers', () => {
    const frame = (payload: unknown) => ({ data: JSON.stringify(payload) });

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
});
