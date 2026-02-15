import { ClientRedis } from '../../client/client-redis.js';

describe('ClientRedis', () => {
  const test = 'test';
  const client = new ClientRedis({});
  const untypedClient = client as any;

  describe('getRequestPattern', () => {
    it(`should leave pattern as it is`, () => {
      const expectedResult = test;
      expect(client.getRequestPattern(test)).toBe(expectedResult);
    });
  });
  describe('getReplyPattern', () => {
    it(`should append ".reply" to string`, () => {
      const expectedResult = test + '.reply';
      expect(client.getReplyPattern(test)).toBe(expectedResult);
    });
  });
  describe('publish', () => {
    const pattern = 'test';
    const msg = { pattern, data: 'data' };
    let subscribeSpy: ReturnType<typeof vi.fn>,
      publishSpy: ReturnType<typeof vi.fn>,
      onSpy: ReturnType<typeof vi.fn>,
      removeListenerSpy: ReturnType<typeof vi.fn>,
      unsubscribeSpy: ReturnType<typeof vi.fn>,
      connectSpy: ReturnType<typeof vi.fn>,
      sub: Record<string, Function>,
      pub: Record<string, Function>;

    beforeEach(() => {
      subscribeSpy = vi.fn((name, fn) => fn());
      publishSpy = vi.fn();
      onSpy = vi.fn();
      removeListenerSpy = vi.fn();
      unsubscribeSpy = vi.fn();

      sub = {
        subscribe: subscribeSpy,
        on: (type, handler) => (type === 'subscribe' ? handler() : onSpy()),
        removeListener: removeListenerSpy,
        unsubscribe: unsubscribeSpy,
      };
      pub = { publish: publishSpy };
      untypedClient.subClient = sub;
      untypedClient.pubClient = pub;
      untypedClient.connectionPromise = Promise.resolve();
      connectSpy = vi.spyOn(client, 'connect');
    });
    afterEach(() => {
      connectSpy.mockRestore();
      untypedClient.connectionPromise = null;
    });
    it('should subscribe to response pattern name', () => {
      client['publish'](msg, () => {});
      expect(subscribeSpy.mock.calls[0][0]).toEqual(`${pattern}.reply`);
    });
    it('should publish stringified message to request pattern name', () => {
      client['publish'](msg, () => {});
      expect(publishSpy).toHaveBeenCalledWith(pattern, JSON.stringify(msg));
    });
    describe('on error', () => {
      let assignPacketIdStub: ReturnType<typeof vi.fn>;
      beforeEach(() => {
        assignPacketIdStub = vi
          .spyOn(client, 'assignPacketId' as any)
          .mockImplementation(() => {
            throw new Error();
          });
      });
      afterEach(() => {
        assignPacketIdStub.mockRestore();
      });

      it('should call callback', () => {
        const callback = vi.fn();
        client['publish'](msg, callback);

        expect(callback).toHaveBeenCalled();
        expect(callback.mock.calls[0][0].err).toBeInstanceOf(Error);
      });
    });
    describe('dispose callback', () => {
      let assignStub: ReturnType<typeof vi.fn>,
        getReplyPatternStub: ReturnType<typeof vi.fn>;
      let callback: ReturnType<typeof vi.fn>, subscription;

      const channel = 'channel';
      const id = '1';

      beforeEach(async () => {
        callback = vi.fn();
        assignStub = vi
          .spyOn(client, 'assignPacketId' as any)
          .mockImplementation(packet =>
            Object.assign(packet as object, { id }),
          );

        getReplyPatternStub = vi
          .spyOn(client, 'getReplyPattern')
          .mockImplementation(() => channel);
        subscription = client['publish'](msg, callback);
        subscription(channel, JSON.stringify({ isDisposed: true, id }));
      });
      afterEach(() => {
        assignStub.mockRestore();
        getReplyPatternStub.mockRestore();
      });

      it('should unsubscribe to response pattern name', () => {
        expect(unsubscribeSpy).toHaveBeenCalledWith(channel);
      });
      it('should clean routingMap', () => {
        expect(client['routingMap'].has(id)).toBe(false);
      });
    });
  });
  describe('createResponseCallback', () => {
    let callback: ReturnType<typeof vi.fn>, subscription; // : ReturnType<typeof client['createResponseCallback']>;
    const responseMessage = {
      response: 'test',
      id: '1',
    };

    describe('not completed', () => {
      beforeEach(async () => {
        callback = vi.fn();

        subscription = client.createResponseCallback();
        client['routingMap'].set(responseMessage.id, callback);
        await subscription(
          'channel',
          Buffer.from(JSON.stringify(responseMessage)),
        );
      });
      it('should call callback with expected arguments', () => {
        expect(callback).toHaveBeenCalledWith({
          err: undefined,
          response: responseMessage.response,
        });
      });
    });
    describe('disposed and "id" is correct', () => {
      beforeEach(async () => {
        callback = vi.fn();
        subscription = client.createResponseCallback();
        client['routingMap'].set(responseMessage.id, callback);
        subscription(
          'channel',
          Buffer.from(
            JSON.stringify({
              ...responseMessage,
              isDisposed: responseMessage.response,
            }),
          ),
        );
      });

      it('should call callback with dispose param', () => {
        expect(callback).toHaveBeenCalledWith({
          isDisposed: true,
          response: responseMessage.response,
          err: undefined,
        });
      });
    });
    describe('disposed and "id" is incorrect', () => {
      beforeEach(() => {
        callback = vi.fn();
        subscription = client.createResponseCallback();
        subscription('channel', Buffer.from(JSON.stringify(responseMessage)));
      });

      it('should not call callback', () => {
        expect(callback).not.toHaveBeenCalled();
      });
    });
  });
  describe('close', () => {
    const untypedClient = client as any;

    let pubClose: ReturnType<typeof vi.fn>;
    let subClose: ReturnType<typeof vi.fn>;
    let pub: any, sub: any;

    beforeEach(() => {
      pubClose = vi.fn();
      subClose = vi.fn();
      pub = { quit: pubClose };
      sub = { quit: subClose };
      untypedClient.pubClient = pub;
      untypedClient.subClient = sub;
    });
    it('should close "pub" when it is not null', async () => {
      await client.close();
      expect(pubClose).toHaveBeenCalled();
    });
    it('should not close "pub" when it is null', async () => {
      untypedClient.pubClient = null;
      await client.close();
      expect(pubClose).not.toHaveBeenCalled();
    });
    it('should close "sub" when it is not null', async () => {
      await client.close();
      expect(subClose).toHaveBeenCalled();
    });
    it('should not close "sub" when it is null', async () => {
      untypedClient.subClient = null;
      await client.close();
      expect(subClose).not.toHaveBeenCalled();
    });
    it('should have isManuallyClosed set to true when "end" event is handled during close', async () => {
      let endHandler: Function | undefined;
      sub.on = (event, handler) => {
        if (event === 'end') endHandler = handler;
      };
      sub.quit = async () => {
        if (endHandler) {
          endHandler();
          expect(untypedClient.isManuallyClosed).toBe(true);
        }
      };
      client.registerEndListener(sub);
      await client.close();
    });

    it('should not log error when "end" event is handled during close', async () => {
      let endHandler: Function | undefined;
      const logError = vi.spyOn(untypedClient.logger, 'error');
      sub.on = (event, handler) => {
        if (event === 'end') endHandler = handler;
      };
      sub.quit = async () => {
        if (endHandler) {
          endHandler();
        }
      };
      client.registerEndListener(sub);
      await client.close();
      expect(logError).not.toHaveBeenCalled();
    });
  });
  describe('connect', () => {
    let createClientSpy: ReturnType<typeof vi.fn>;
    let registerErrorListenerSpy: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      untypedClient.connectionPromise = null;
      createClientSpy = vi.spyOn(client, 'createClient').mockImplementation(
        () =>
          ({
            on: () => null,
            addListener: () => null,
            removeListener: () => null,
            connect: () => Promise.resolve(),
          }) as any,
      );
      registerErrorListenerSpy = vi.spyOn(client, 'registerErrorListener');

      await client.connect();
      client['pubClient'] = null;
    });
    afterEach(() => {
      createClientSpy.mockRestore();
      registerErrorListenerSpy.mockRestore();
    });
    it('should call "createClient" twice', () => {
      expect(createClientSpy).toHaveBeenCalledTimes(2);
    });
    it('should call "registerErrorListener" twice', () => {
      expect(registerErrorListenerSpy).toHaveBeenCalledTimes(2);
    });
  });
  describe('registerErrorListener', () => {
    it('should bind error event handler', () => {
      const callback = vi
        .fn()
        .mockImplementation((_, fn) => fn({ code: 'test' }));
      const emitter = {
        addListener: callback,
      };
      client.registerErrorListener(emitter as any);
      expect(callback.mock.calls[0][0]).toEqual('error');
    });
  });
  describe('registerEndListener', () => {
    it('should bind end event handler', () => {
      const callback = vi
        .fn()
        .mockImplementation((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerEndListener(emitter as any);
      expect(callback.mock.calls[0][0]).toEqual('end');
    });
  });
  describe('registerReadyListener', () => {
    it('should bind ready event handler', () => {
      const callback = vi
        .fn()
        .mockImplementation((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerReadyListener(emitter as any);
      expect(callback.mock.calls[0][0]).toEqual('ready');
    });
  });
  describe('registerReconnectListener', () => {
    it('should bind reconnect event handler', () => {
      const callback = vi
        .fn()
        .mockImplementation((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerReconnectListener(emitter as any);
      expect(callback.mock.calls[0][0]).toEqual('reconnecting');
    });
  });
  describe('getClientOptions', () => {
    it('should return options object with "retryStrategy" and call "createRetryStrategy"', () => {
      const createSpy = vi.spyOn(client, 'createRetryStrategy');
      const { retryStrategy } = client.getClientOptions()!;
      try {
        retryStrategy!({} as any);
      } catch {
        // No empty
      }
      expect(createSpy).toHaveBeenCalled();
    });
  });
  describe('createRetryStrategy', () => {
    describe('when is terminated', () => {
      it('should return undefined', () => {
        untypedClient.isManuallyClosed = true;
        const result = client.createRetryStrategy(0);
        expect(result).toBeUndefined();
      });
    });
    describe('when "retryAttempts" does not exist', () => {
      it('should return undefined', () => {
        untypedClient.isManuallyClosed = false;
        untypedClient.options.options = {};
        untypedClient.options.options.retryAttempts = undefined;
        const result = client.createRetryStrategy(1);
        expect(result).toBeUndefined();
      });
    });
    describe('when "attempts" count is max', () => {
      it('should return undefined', () => {
        untypedClient.isManuallyClosed = false;
        untypedClient.options.options = {};
        untypedClient.options.options.retryAttempts = 3;
        const result = client.createRetryStrategy(4);
        expect(result).toBeUndefined();
      });
    });
    describe('otherwise', () => {
      it('should return delay (ms)', () => {
        untypedClient.options = {};
        untypedClient.isManuallyClosed = false;
        untypedClient.options.retryAttempts = 3;
        untypedClient.options.retryDelay = 3;
        const result = client.createRetryStrategy(2);
        expect(result).toEqual(untypedClient.options.retryDelay);
      });
    });
  });
  describe('dispatchEvent', () => {
    const msg = { pattern: 'pattern', data: 'data' };
    let publishStub: ReturnType<typeof vi.fn>, pubClient;

    beforeEach(() => {
      publishStub = vi.fn();
      pubClient = {
        publish: publishStub,
      };
      untypedClient.pubClient = pubClient;
    });

    it('should publish packet', async () => {
      publishStub.mockImplementation((a, b, c) => c());
      await client['dispatchEvent'](msg);

      expect(publishStub).toHaveBeenCalled();
    });
    it('should throw error', async () => {
      publishStub.mockImplementation((a, b, c) => c(new Error()));
      client['dispatchEvent'](msg).catch(err =>
        expect(err).toBeInstanceOf(Error),
      );
    });
  });
});
