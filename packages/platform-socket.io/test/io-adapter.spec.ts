import { EventEmitter } from 'events';
import { config, from, mergeAll, of } from 'rxjs';
import { IoAdapter } from '../adapters/io-adapter.js';
import { WsProxy } from '../../websockets/context/ws-proxy.js';
import { WsExceptionsHandler } from '../../websockets/exceptions/ws-exceptions-handler.js';
import { WebSocketsController } from '../../websockets/web-sockets-controller.js';

describe('IoAdapter', () => {
  let adapter: IoAdapter;

  beforeEach(() => {
    adapter = new IoAdapter();
  });

  describe('bindMessageHandlers', () => {
    it('should register only one disconnect listener regardless of call count', () => {
      const addListenerSpy = vi.fn();
      const fakeSocket = {
        on: addListenerSpy,
        off: vi.fn(),
        addListener: addListenerSpy,
        removeListener: vi.fn(),
      } as any;

      const handler = {
        message: 'test-event',
        methodName: 'handleTestEvent',
        callback: vi.fn().mockReturnValue({ data: 'response' }),
        isAckHandledManually: false,
      };

      const transform = (data: any) => of(data);

      // Call bindMessageHandlers twice on the same socket
      // (simulates two gateways sharing the same socket)
      adapter.bindMessageHandlers(fakeSocket, [handler], transform);
      adapter.bindMessageHandlers(fakeSocket, [handler], transform);

      const disconnectCalls = addListenerSpy.mock.calls.filter(
        call => call[0] === 'disconnect',
      );

      expect(disconnectCalls).toHaveLength(1);

      // message handlers should still be registered per call
      const messageCalls = addListenerSpy.mock.calls.filter(
        call => call[0] === 'test-event',
      );
      expect(messageCalls).toHaveLength(2);
    });

    it('should not let a throwing handler tear down the message stream', async () => {
      const socket = new EventEmitter() as any;
      let calls = 0;
      const handler = {
        message: 'test-event',
        methodName: 'handleTestEvent',
        callback: () => {
          calls++;
          if (calls === 1) {
            throw new Error('handler blew up');
          }
          return { event: 'test-event-reply', data: 'recovered' };
        },
        isAckHandledManually: false,
      };

      const replies: any[] = [];
      socket.on('test-event-reply', (payload: any) => replies.push(payload));

      adapter.bindMessageHandlers(socket, [handler], (data: any) => of(data));

      socket.emit('test-event', { data: {} });
      socket.emit('test-event', { data: {} });

      expect(calls).toBe(2);
      expect(replies).toEqual(['recovered']);
    });

    it('should not ack a throwing message but keep acking the next one', () => {
      const socket = new EventEmitter() as any;
      let calls = 0;
      const handler = {
        message: 'test-event',
        methodName: 'handleTestEvent',
        callback: () => {
          calls++;
          if (calls === 1) {
            throw new Error('handler blew up');
          }
          return { data: 'ok' };
        },
        isAckHandledManually: false,
      };

      const ack = vi.fn();
      adapter.bindMessageHandlers(socket, [handler], (data: any) => of(data));

      socket.emit('test-event', [{ a: 1 }, ack]);
      expect(calls).toBe(1);
      expect(ack).not.toHaveBeenCalled();

      socket.emit('test-event', [{ a: 1 }, ack]);
      expect(calls).toBe(2);
      expect(ack).toHaveBeenCalledWith({ data: 'ok' });
    });

    it('should not let a rejected handler tear down the message stream', async () => {
      const unhandled: unknown[] = [];
      config.onUnhandledError = err => unhandled.push(err);
      const logError = vi
        .spyOn(adapter['logger'], 'error')
        .mockImplementation(() => undefined);

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

      expect(calls).toBe(2);
      expect(replies).toEqual(['ok']);
      expect(unhandled).toEqual([]);
      expect(logError).toHaveBeenCalledTimes(1);
    });
  });
});
