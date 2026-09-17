import { throwError as _throw, lastValueFrom, Observable, of } from 'rxjs';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context.js';
import { Server } from '../../server/server.js';

class TestServer extends Server {
  public on<
    EventKey extends string = string,
    EventCallback extends Function = Function,
  >(event: EventKey, callback: EventCallback) {}
  public unwrap<T>(): T {
    return null!;
  }
  public listen(callback: () => void) {}
  public close() {}
}

describe('Server', () => {
  const server = new TestServer();
  const untypedServer = server as any;
  const callback = () => {},
    pattern = { test: 'test pattern' };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addHandler', () => {
    it(`should add handler`, () => {
      const handlerRoute = 'hello';
      untypedServer.messageHandlers = new Map();

      const messageHandlersSetSpy = vi.spyOn(
        untypedServer.messageHandlers,
        'set',
      );
      const normalizePatternStub = vi
        .spyOn(server as any, 'normalizePattern')
        .mockReturnValue(handlerRoute);

      server.addHandler(pattern, callback as any);

      expect(messageHandlersSetSpy).toHaveBeenCalled();
      expect(messageHandlersSetSpy.mock.calls[0][0]).toBe(handlerRoute);
      expect(messageHandlersSetSpy.mock.calls[0][1]).toBe(callback);

      normalizePatternStub.mockRestore();
    });
    describe('when handler is an event handler', () => {
      describe('and there are other handlers registered for the pattern already', () => {
        it('should find tail and assign a handler ref to it', () => {
          const handlerRoute = 'hello';
          const headHandler: any = () => null;
          const nextHandler: any = () => null;

          headHandler.next = nextHandler;
          untypedServer['messageHandlers'] = new Map([
            [handlerRoute, headHandler],
          ]);
          const normalizePatternStub = vi
            .spyOn(server as any, 'normalizePattern')
            .mockReturnValue(handlerRoute);

          server.addHandler(pattern, callback as any, true);

          expect(nextHandler.next).toBe(callback);
          normalizePatternStub.mockRestore();
        });
      });
    });
  });

  describe('getRouteFromPattern', () => {
    let normalizePatternStub: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      normalizePatternStub = vi
        .spyOn(server as any, 'normalizePattern')
        .mockImplementation(() => ({}) as any);
    });

    afterEach(() => {
      normalizePatternStub.mockRestore();
    });

    describe(`when gets 'string' pattern`, () => {
      it(`should call 'transformPatternToRoute' with 'string' argument`, () => {
        const inputServerPattern = 'hello';
        const transformedServerPattern = inputServerPattern;
        untypedServer.getRouteFromPattern(inputServerPattern);

        expect(normalizePatternStub.mock.calls[0][0]).toBe(
          transformedServerPattern,
        );
      });
    });

    describe(`when gets 'json' pattern as 'string'`, () => {
      it(`should call 'transformPatternToRoute' with 'json' argument`, () => {
        const inputServerPattern = '{"controller":"app","use":"getHello"}';
        const transformedServerPattern = {
          controller: 'app',
          use: 'getHello',
        };
        untypedServer.getRouteFromPattern(inputServerPattern);

        expect(normalizePatternStub.mock.calls[0][0]).toEqual(
          transformedServerPattern,
        );
      });
    });
  });

  describe('send', () => {
    let stream$: Observable<string>;
    let sendSpy: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      stream$ = of('test');
    });
    describe('when stream', () => {
      beforeEach(() => {
        sendSpy = vi.fn();
      });
      describe('throws exception', () => {
        beforeEach(() => {
          server.send(_throw(() => 'test') as any, sendSpy);
        });
        it('should send error and complete', async () => {
          await new Promise<void>(resolve => process.nextTick(resolve));
          expect(sendSpy).toHaveBeenCalledWith({
            err: 'test',
            isDisposed: true,
          });
        });
      });
      describe('emits response', () => {
        beforeEach(() => {
          server.send(stream$, sendSpy);
        });
        it('should send response and "complete" event', async () => {
          await new Promise<void>(resolve => process.nextTick(resolve));
          expect(sendSpy).toHaveBeenCalledWith({
            response: 'test',
            isDisposed: true,
          });
        });
      });
    });
  });
  describe('transformToObservable', () => {
    describe('when resultOrDeferred', () => {
      describe('is Promise', () => {
        it('should return Observable that emits the resolved value of the supplied promise', async () => {
          const value = 100;
          expect(
            await lastValueFrom(
              server.transformToObservable(Promise.resolve(value)),
            ),
          ).toBe(100);
        });
      });
      describe('is Observable', () => {
        it('should return the observable itself', async () => {
          const value = 100;
          expect(
            await lastValueFrom(server.transformToObservable(of(value))),
          ).toBe(100);
        });
      });
      describe('is any number', () => {
        it('should return Observable that emits the supplied number', async () => {
          const value = 100;
          expect(await lastValueFrom(server.transformToObservable(value))).toBe(
            100,
          );
        });
      });
      describe('is an array', () => {
        it('should return Observable that emits the supplied array', async () => {
          const value = [1, 2, 3];
          expect(await lastValueFrom(server.transformToObservable(value))).toBe(
            value,
          );
        });
      });
    });
  });

  describe('getHandlers', () => {
    it('should return registered handlers', () => {
      const messageHandlers = [() => null, () => true];
      const original = untypedServer.messageHandlers;
      untypedServer.messageHandlers = messageHandlers;
      expect(server.getHandlers()).toBe(messageHandlers);
      untypedServer.messageHandlers = original;
    });
  });

  describe('getHandlerByPattern', () => {
    let messageHandlersGetSpy: ReturnType<typeof vi.spyOn>;
    let messageHandlersHasSpy: ReturnType<typeof vi.spyOn>;
    let originalMessageHandlers: any;
    const handlerRoute = 'hello';

    beforeEach(() => {
      originalMessageHandlers = untypedServer.messageHandlers;
      untypedServer.messageHandlers = new Map();
      messageHandlersGetSpy = vi
        .spyOn(untypedServer.messageHandlers, 'get')
        .mockReturnValue(callback);
      messageHandlersHasSpy = vi
        .spyOn(untypedServer.messageHandlers, 'has')
        .mockReturnValue(false);

      vi.spyOn(server as any, 'getRouteFromPattern').mockReturnValue(
        handlerRoute,
      );
    });

    afterEach(() => {
      messageHandlersGetSpy.mockRestore();
      messageHandlersHasSpy.mockRestore();
      untypedServer.messageHandlers = originalMessageHandlers;
    });

    describe('when handler exists', () => {
      it('should return expected handler', () => {
        messageHandlersHasSpy.mockReturnValue(true);

        const value = server.getHandlerByPattern(handlerRoute);

        expect(messageHandlersHasSpy.mock.calls[0][0]).toBe(handlerRoute);
        expect(messageHandlersGetSpy).toHaveBeenCalled();
        expect(messageHandlersGetSpy.mock.calls[0][0]).toBe(handlerRoute);
        expect(value).toBe(callback);
      });
    });

    describe('when handler does not exists', () => {
      it('should return null', () => {
        messageHandlersHasSpy.mockReturnValue(false);

        const value = server.getHandlerByPattern(handlerRoute);

        expect(messageHandlersHasSpy.mock.calls[0][0]).toBe(handlerRoute);
        expect(messageHandlersGetSpy).not.toHaveBeenCalled();
        expect(value).toBeNull();
      });
    });
  });

  describe('handleEvent', () => {
    const context = new BaseRpcContext([]);
    const eventPattern = 'test_event';

    function bindHandler(result: unknown) {
      const endHook = vi.fn();
      untypedServer.onProcessingStartHook = (
        _transportId: unknown,
        _ctx: unknown,
        fn: () => Promise<void>,
      ) => fn();
      untypedServer.onProcessingEndHook = endHook;
      untypedServer.messageHandlers = new Map([
        [
          eventPattern,
          Object.assign(async () => result, { isEventHandler: true }),
        ],
      ]);
      return endHook;
    }

    it('should log an error if no event handler exists', async () => {
      const loggerErrorSpy = vi
        .spyOn(untypedServer.logger, 'error')
        .mockImplementation(() => {});
      untypedServer.messageHandlers = new Map();

      await server.handleEvent(
        'unknown_event',
        { pattern: 'unknown_event', data: null },
        context,
      );

      expect(loggerErrorSpy).toHaveBeenCalledOnce();
    });

    it('should run the end hook when the handler returns a plain value', async () => {
      const endHook = bindHandler('plain');

      await server.handleEvent(
        eventPattern,
        { pattern: eventPattern, data: null },
        context,
      );

      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should run the end hook when the returned stream completes', async () => {
      const endHook = bindHandler(of('streamed'));

      await server.handleEvent(
        eventPattern,
        { pattern: eventPattern, data: null },
        context,
      );

      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should run the end hook when the returned stream fails', async () => {
      const endHook = bindHandler(_throw(() => new Error('failed')));

      await server.handleEvent(
        eventPattern,
        { pattern: eventPattern, data: null },
        context,
      );

      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should run the end hook when the handler throws an error', async () => {
      const endHook = vi.fn();
      untypedServer.onProcessingStartHook = (
        _transportId: unknown,
        _ctx: unknown,
        fn: () => Promise<void>,
      ) => fn();
      untypedServer.onProcessingEndHook = endHook;
      untypedServer.messageHandlers = new Map([
        [
          eventPattern,
          Object.assign(
            async () => {
              throw new Error('handler failed');
            },
            { isEventHandler: true },
          ),
        ],
      ]);

      await expect(
        server.handleEvent(
          eventPattern,
          { pattern: eventPattern, data: null },
          context,
        ),
      ).rejects.toThrow('handler failed');
      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should run the end hook once per event', async () => {
      const endHook = bindHandler(
        new Observable(subscriber => {
          subscriber.next('first');
          subscriber.next('second');
          subscriber.complete();
        }),
      );

      await server.handleEvent(
        eventPattern,
        { pattern: eventPattern, data: null },
        context,
      );

      expect(endHook).toHaveBeenCalledOnce();
    });
  });
});
