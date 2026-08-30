import { createServer } from 'http';
import { lastValueFrom, of, toArray, type Observable } from 'rxjs';
import { WsAdapter } from '../adapters/ws-adapter.js';

describe('WsAdapter', () => {
  describe('bindMessageHandler', () => {
    const collect = (source: Observable<any>) =>
      lastValueFrom(source.pipe(toArray()));
    const transform = (data: any) => of(data);
    const frame = (payload: unknown) => ({ data: JSON.stringify(payload) });
    const handlersFor = (event: string, callback: (...args: any[]) => any) =>
      new Map([
        [
          event,
          {
            message: event,
            methodName: event,
            callback,
            isAckHandledManually: false,
          },
        ],
      ]) as any;
    const silenceLogger = (adapter: WsAdapter) =>
      vi.spyOn(adapter['logger'], 'error').mockImplementation(() => undefined);

    it('should report a custom message parser that throws', async () => {
      const adapter = new WsAdapter(undefined, {
        messageParser: () => {
          throw new Error('parser blew up');
        },
      });
      const logError = silenceLogger(adapter);

      const result = await collect(
        adapter.bindMessageHandler({ data: 'anything' }, new Map(), transform),
      );

      expect(result).toEqual([]);
      expect(logError).toHaveBeenCalledTimes(1);
    });

    it('should report a throwing parser installed through setMessageParser', async () => {
      const adapter = new WsAdapter();
      adapter.setMessageParser(() => {
        throw new Error('parser blew up');
      });
      const logError = silenceLogger(adapter);

      const result = await collect(
        adapter.bindMessageHandler({ data: 'anything' }, new Map(), transform),
      );

      expect(result).toEqual([]);
      expect(logError).toHaveBeenCalledTimes(1);
    });

    it('should stay silent when the default parser rejects a malformed frame', async () => {
      const adapter = new WsAdapter();
      const logError = silenceLogger(adapter);

      const result = await collect(
        adapter.bindMessageHandler({ data: 'not json' }, new Map(), transform),
      );

      expect(result).toEqual([]);
      expect(logError).not.toHaveBeenCalled();
    });

    it('should drop an unregistered event without invoking any handler', async () => {
      const adapter = new WsAdapter();
      const callback = vi.fn();
      const logError = silenceLogger(adapter);

      const result = await collect(
        adapter.bindMessageHandler(
          frame({ event: 'nope', data: {} }),
          handlersFor('known', callback),
          transform,
        ),
      );

      expect(result).toEqual([]);
      expect(callback).not.toHaveBeenCalled();
      expect(logError).not.toHaveBeenCalled();
    });

    it('should drop the frame when the parser returns nothing', async () => {
      const adapter = new WsAdapter(undefined, {
        messageParser: () => undefined,
      });
      const callback = vi.fn();

      const result = await collect(
        adapter.bindMessageHandler(
          { data: 'anything' },
          handlersFor('known', callback),
          transform,
        ),
      );

      expect(result).toEqual([]);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should invoke the registered handler with the payload and the event name', async () => {
      const adapter = new WsAdapter();
      const callback = vi.fn().mockReturnValue('reply');

      const result = await collect(
        adapter.bindMessageHandler(
          frame({ event: 'known', data: { a: 1 } }),
          handlersFor('known', callback),
          transform,
        ),
      );

      expect(callback).toHaveBeenCalledWith({ a: 1 }, 'known');
      expect(result).toEqual(['reply']);
    });

    it('should not let a throwing handler tear down the message stream', async () => {
      const adapter = new WsAdapter();
      const callback = () => {
        throw new Error('handler blew up');
      };

      const result = await collect(
        adapter.bindMessageHandler(
          frame({ event: 'known', data: {} }),
          handlersFor('known', callback),
          transform,
        ),
      );

      expect(result).toEqual([]);
    });
  });

  describe('dispose', () => {
    it('should remove the upgrade listener it added to a caller-supplied server', async () => {
      const httpServer = createServer();
      const adapter = new WsAdapter(httpServer);

      adapter.create(0, { path: '/live' });
      expect(httpServer.listenerCount('upgrade')).toBe(1);

      await adapter.dispose();

      expect(httpServer.listenerCount('upgrade')).toBe(0);
    });

    it('should not accumulate upgrade listeners across adapters sharing a server', async () => {
      const httpServer = createServer();

      for (let i = 0; i < 3; i++) {
        const adapter = new WsAdapter(httpServer);
        adapter.create(0, { path: '/live' });
        await adapter.dispose();
      }

      expect(httpServer.listenerCount('upgrade')).toBe(0);
    });
  });
});
