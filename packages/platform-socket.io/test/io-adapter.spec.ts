import { EventEmitter } from 'events';
import { of } from 'rxjs';
import { IoAdapter } from '../adapters/io-adapter.js';

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
      await new Promise(resolve => setTimeout(resolve, 20));
      socket.emit('test-event', { data: {} });
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(calls).toBe(2);
      expect(replies).toEqual(['recovered']);
    });
  });
});
