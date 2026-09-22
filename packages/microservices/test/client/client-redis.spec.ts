import { EventEmitter } from 'events';
import { AddressInfo, createServer } from 'net';
import { ClientRedis } from '../../client/client-redis.js';

/**
 * Stands in for an ioredis client. Like ioredis, it emits the connection
 * events before the `connect()` promise they settle is observed.
 */
class FakeRedisClient extends EventEmitter {
  public status = 'wait';
  private settle?: {
    resolve: () => void;
    reject: (err: Error) => void;
  };
  public readonly connect = vi.fn(
    () =>
      new Promise<void>((resolve, reject) => {
        this.status = 'connecting';
        this.settle = { resolve, reject };
      }),
  );
  public readonly quit = vi.fn(async () => 'OK');
  public readonly disconnect = vi.fn(() => {
    this.status = 'end';
  });

  /** Connected (or reconnected). */
  public ready() {
    this.status = 'ready';
    this.emit('ready');
    this.settle?.resolve();
  }

  /** Connection closed, ioredis schedules a retry. */
  public closeAndRetry() {
    this.status = 'reconnecting';
    this.settle?.reject(new Error('Connection is closed.'));
    this.emit('reconnecting');
  }

  /** Connection closed, ioredis gives up on the client. */
  public closeAndEnd() {
    this.status = 'end';
    this.settle?.reject(new Error('Connection is closed.'));
    this.emit('end');
  }
}

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
    describe('when subscribing to the response pattern fails', () => {
      it('should call callback with the error and not publish', () => {
        client['subscriptionsCount'].clear();
        client['routingMap'].clear();
        const error = new Error('Connection is closed.');
        subscribeSpy.mockImplementation((name, fn) => fn(error));
        const callback = vi.fn();

        client['publish'](msg, callback);

        expect(callback).toHaveBeenCalledWith({ err: error });
        expect(publishSpy).not.toHaveBeenCalled();
        expect(client['routingMap'].size).toBe(0);
      });
    });
    describe('when disposed before the subscription is confirmed', () => {
      it('should not publish, count the subscription, nor unsubscribe', () => {
        client['subscriptionsCount'].clear();
        client['routingMap'].clear();
        let confirmSubscription: () => void = () => {};
        subscribeSpy.mockImplementation((name, fn) => {
          confirmSubscription = () => fn();
        });
        const callback = vi.fn();

        const dispose = client['publish'](msg, callback);
        dispose();
        confirmSubscription();

        expect(publishSpy).not.toHaveBeenCalled();
        expect(client['routingMap'].size).toBe(0);
        expect(client['subscriptionsCount'].has(`${pattern}.reply`)).toBe(
          false,
        );
        expect(unsubscribeSpy).not.toHaveBeenCalled();
        expect(callback).not.toHaveBeenCalled();
        expect(callback).not.toHaveBeenCalled();
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

    describe('when publishing throws', () => {
      const responseChannel = `${pattern}.reply`;

      beforeEach(() => {
        client['subscriptionsCount'].clear();
        client['routingMap'].clear();
        publishSpy.mockImplementation(() => {
          throw new Error('Send error');
        });
      });

      it('should undo what the request had already set up', () => {
        client['publish'](msg, vi.fn());

        expect(client['routingMap'].size).toBe(0);
        expect(client['subscriptionsCount'].get(responseChannel)).toBe(0);
      });

      it('should undo it as well when the subscription is acknowledged later', () => {
        let acknowledge = () => {};
        subscribeSpy.mockImplementation((_channel, done) => {
          acknowledge = () => done();
        });
        const callback = vi.fn();

        client['publish'](msg, callback);
        acknowledge();

        expect(client['routingMap'].size).toBe(0);
        expect(client['subscriptionsCount'].get(responseChannel)).toBe(0);
        expect(callback).toHaveBeenCalledWith({
          err: expect.objectContaining({ message: 'Send error' }),
        });
      });

      it('should leave the response channel subscribed', () => {
        // A concurrent request on this pattern may still be waiting for its
        // own subscribe reply, so the subscription is left to self-heal.
        client['publish'](msg, vi.fn());

        expect(unsubscribeSpy).not.toHaveBeenCalled();
      });

      it('should undo the bookkeeping once', () => {
        const teardown = client['publish'](msg, vi.fn());

        teardown();

        expect(client['routingMap'].size).toBe(0);
        expect(client['subscriptionsCount'].get(responseChannel)).toBe(0);
        expect(unsubscribeSpy).not.toHaveBeenCalled();
      });

      it('should keep the count of the requests already using the channel', () => {
        client['subscriptionsCount'].set(responseChannel, 1);

        const teardown = client['publish'](msg, vi.fn());
        teardown();

        expect(subscribeSpy).not.toHaveBeenCalled();
        expect(client['routingMap'].size).toBe(0);
        expect(client['subscriptionsCount'].get(responseChannel)).toBe(1);
        expect(unsubscribeSpy).not.toHaveBeenCalled();
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
    describe('custom binary format (not json)', () => {
      it('should use buffer directly without parsing it as json', async () => {
        const clientWithBuffers = new ClientRedis({ returnBuffers: true });
        const callback = vi.fn();
        const str = `${responseMessage.id}|${responseMessage.response}`;
        const bufferMessage = Buffer.from(str);
        vi.spyOn(
          Reflect.get(clientWithBuffers, 'deserializer'),
          'deserialize',
        ).mockResolvedValue({
          ...responseMessage,
          response: bufferMessage,
        });
        const subscription = clientWithBuffers.createResponseCallback();

        clientWithBuffers['routingMap'].set(responseMessage.id, callback);
        await subscription('channel', bufferMessage as any);

        expect(callback).toHaveBeenCalledWith({
          err: undefined,
          response: bufferMessage,
        });
      });
    });
  });
  describe('close', () => {
    const untypedClient = client as any;

    let pubClose: ReturnType<typeof vi.fn>;
    let subClose: ReturnType<typeof vi.fn>;
    let callback: ReturnType<typeof vi.fn>;
    let routingMap: Map<string, Function>;
    let pub: any, sub: any;

    beforeEach(() => {
      pubClose = vi.fn();
      subClose = vi.fn();
      callback = vi.fn();
      routingMap = new Map<string, Function>();
      routingMap.set('some id', callback);
      pub = { quit: pubClose };
      sub = { quit: subClose };
      untypedClient.pubClient = pub;
      untypedClient.subClient = sub;
      untypedClient.routingMap = routingMap;
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
    it('should clear out the routing map', async () => {
      await client.close();
      expect(untypedClient.routingMap.size).toBe(0);
    });
    it('should call pending callbacks with connection closed error', async () => {
      await client.close();
      expect(callback).toHaveBeenCalledWith({
        err: expect.objectContaining({ message: 'Connection closed' }),
      });
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

    it('should reset connection state for a subsequent connection', async () => {
      untypedClient.isManuallyClosed = false;
      untypedClient.wasInitialConnectionSuccessful = true;

      await client.close();

      expect(untypedClient.isManuallyClosed).toBe(false);
      expect(untypedClient.wasInitialConnectionSuccessful).toBe(false);
    });

    it('should register the response listener after close and reconnect', async () => {
      const firstSubClient = { quit: vi.fn() };
      const secondSubClient = { on: vi.fn() };
      untypedClient.pubClient = { quit: vi.fn() };
      untypedClient.subClient = firstSubClient;
      untypedClient.wasInitialConnectionSuccessful = true;

      await client.close();
      untypedClient.subClient = secondSubClient;
      client.registerReadyListener(secondSubClient);

      const readyHandler = secondSubClient.on.mock.calls[0][1];
      readyHandler();

      expect(secondSubClient.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
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
  describe('connection lifecycle', () => {
    const connectionLost = 'Error: Connection lost. Trying to reconnect...';
    let lifecycleClient: ClientRedis;
    let untypedLifecycleClient: any;
    let created: FakeRedisClient[];

    const setUp = (options: ConstructorParameters<typeof ClientRedis>[0]) => {
      lifecycleClient = new ClientRedis(options);
      untypedLifecycleClient = lifecycleClient as any;
      vi.spyOn(untypedLifecycleClient.logger, 'log').mockImplementation(
        () => {},
      );
      vi.spyOn(untypedLifecycleClient.logger, 'error').mockImplementation(
        () => {},
      );
      created = [];
      vi.spyOn(lifecycleClient, 'createClient').mockImplementation(async () => {
        const fake = new FakeRedisClient();
        created.push(fake);
        return fake;
      });
    };

    /**
     * Calls `connect()` and lets it create the pair and start connecting it.
     */
    const startConnecting = async () => {
      const attempt = lifecycleClient.connect();
      attempt.catch(() => {});
      await new Promise(resolve => setImmediate(resolve));
      const [pub, sub] = created.slice(-2);
      return { attempt, pub, sub };
    };
    const connectPair = async () => {
      const { attempt, pub, sub } = await startConnecting();
      pub.ready();
      sub.ready();
      await attempt;
      return [pub, sub];
    };
    const currentPair = () => [
      untypedLifecycleClient.pubClient,
      untypedLifecycleClient.subClient,
    ];

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('when "retryAttempts" is set', () => {
      beforeEach(() => setUp({ retryAttempts: 1 }));

      it('should let ioredis retry a failed first attempt in the background', async () => {
        const { attempt, pub, sub } = await startConnecting();
        pub.closeAndRetry();
        sub.closeAndRetry();

        await expect(attempt).rejects.toThrow('Connection is closed.');
        await expect(lifecycleClient.connect()).rejects.toBe(connectionLost);
        expect(currentPair()).toEqual([pub, sub]);
        expect(pub.disconnect).not.toHaveBeenCalled();
        expect(pub.quit).not.toHaveBeenCalled();

        pub.ready();
        sub.ready();

        await expect(lifecycleClient.connect()).resolves.toBeUndefined();
        expect(created).toHaveLength(2);
        expect(sub.listenerCount('message')).toBe(1);
      });

      it('should start over once the retries of the first attempt are exhausted', async () => {
        const { attempt, pub, sub } = await startConnecting();
        pub.closeAndRetry();
        sub.closeAndRetry();
        await expect(attempt).rejects.toThrow('Connection is closed.');

        pub.closeAndEnd();
        sub.closeAndEnd();
        const [newPub, newSub] = await connectPair();

        expect(created).toHaveLength(4);
        expect(currentPair()).toEqual([newPub, newSub]);
        expect(newSub.listenerCount('message')).toBe(1);
      });

      it('should start over once a lost connection runs out of retries', async () => {
        const [pub, sub] = await connectPair();
        pub.closeAndRetry();
        sub.closeAndRetry();
        await expect(lifecycleClient.connect()).rejects.toBe(connectionLost);

        pub.closeAndEnd();
        expect(currentPair()).toEqual([null, null]);
        expect(sub.disconnect).toHaveBeenCalled();
        sub.closeAndEnd();

        const [, newSub] = await connectPair();
        expect(created).toHaveLength(4);
        expect(newSub.listenerCount('message')).toBe(1);
      });
    });

    describe('when "retryAttempts" is not set', () => {
      beforeEach(() => setUp({}));

      it('should start over after the connection is lost', async () => {
        const [pub, sub] = await connectPair();
        pub.closeAndEnd();
        sub.closeAndEnd();

        const [newPub, newSub] = await connectPair();

        expect(created).toHaveLength(4);
        expect(currentPair()).toEqual([newPub, newSub]);
        expect(newSub.listenerCount('message')).toBe(1);
      });

      it('should drop both clients when only one of them fails to connect', async () => {
        const { attempt, pub, sub } = await startConnecting();
        pub.ready();
        sub.closeAndEnd();

        await expect(attempt).rejects.toThrow('Connection is closed.');
        expect(pub.disconnect).toHaveBeenCalled();
        expect(currentPair()).toEqual([null, null]);

        const [, newSub] = await connectPair();
        expect(newSub.listenerCount('message')).toBe(1);
      });
    });

    it.each([
      ['set', { retryAttempts: 1 }],
      ['not set', {}],
    ])(
      'should ignore the events of a dropped client ("retryAttempts" %s)',
      async (_, options) => {
        setUp(options);
        const [pub, sub] = await connectPair();
        sub.closeAndEnd();
        const [newPub, newSub] = await connectPair();

        // The pub client dropped along with the sub one only shuts down now
        pub.emit('reconnecting');
        pub.emit('end');

        expect(currentPair()).toEqual([newPub, newSub]);
        expect(newPub.disconnect).not.toHaveBeenCalled();
        await expect(lifecycleClient.connect()).resolves.toBeUndefined();
        expect(created).toHaveLength(4);
      },
    );

    it('should start over when creating the clients fails', async () => {
      setUp({});
      const error = new Error('cannot create client');
      vi.mocked(lifecycleClient.createClient)
        .mockImplementationOnce(async () => {
          const fake = new FakeRedisClient();
          created.push(fake);
          return fake;
        })
        .mockRejectedValueOnce(error);

      await expect(lifecycleClient.connect()).rejects.toBe(error);
      expect(created[0].disconnect).toHaveBeenCalled();
      expect(untypedLifecycleClient.connectionPromise).toBeNull();

      await connectPair();
      expect(currentPair()).toEqual(created.slice(1));
    });

    it('should attach the listeners registered with "on" to every new pair', async () => {
      setUp({});
      const registeredBeforeConnect = vi.fn();
      const registeredWhileConnected = vi.fn();
      lifecycleClient.on('warning', registeredBeforeConnect);

      const [pub, sub] = await connectPair();
      lifecycleClient.on('warning', registeredWhileConnected);
      pub.closeAndEnd();
      sub.closeAndEnd();
      const [newPub, newSub] = await connectPair();
      newPub.emit('warning', 'first');
      newSub.emit('warning', 'second');

      for (const listener of [
        registeredBeforeConnect,
        registeredWhileConnected,
      ]) {
        expect(listener).toHaveBeenCalledWith('pub', 'first');
        expect(listener).toHaveBeenCalledWith('sub', 'second');
      }
    });

    it('should let a real ioredis client retry, then start over once it gives up', async () => {
      let acceptedConnections = 0;
      const server = createServer(socket => {
        acceptedConnections++;
        socket.destroy();
      });
      await new Promise<void>(resolve =>
        server.listen(0, '127.0.0.1', resolve),
      );
      const { port } = server.address() as AddressInfo;
      const realClient = new ClientRedis({
        host: '127.0.0.1',
        port,
        retryAttempts: 2,
        retryDelay: 10,
      });
      vi.spyOn((realClient as any).logger, 'log').mockImplementation(() => {});
      vi.spyOn((realClient as any).logger, 'error').mockImplementation(
        () => {},
      );
      const realClients: any[] = [];
      const createClient = realClient.createClient.bind(realClient);
      const createClientSpy = vi
        .spyOn(realClient, 'createClient')
        .mockImplementation(async () => {
          const redis = await createClient();
          realClients.push(redis);
          return redis;
        });
      const allEnded = () =>
        vi.waitFor(() =>
          expect(realClients.map(redis => redis.status)).toEqual(
            realClients.map(() => 'end'),
          ),
        );

      try {
        await expect(realClient.connect()).rejects.toThrow();
        await allEnded();
        // Both clients were retried before ioredis gave up on them
        expect(acceptedConnections).toBe(6);

        await expect(realClient.connect()).rejects.toThrow();
        expect(createClientSpy).toHaveBeenCalledTimes(4);
        await allEnded();
      } finally {
        await realClient.close();
        await new Promise(resolve => server.close(resolve));
      }
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
    it('should call pending callbacks when connection ends unexpectedly', () => {
      const client = new ClientRedis({});
      const callback = vi.fn();
      const emitter = {
        on: vi.fn().mockImplementation((_, fn) => fn()),
        disconnect: vi.fn(),
      };

      client['routingMap'].set('some id', callback);
      client['subscriptionsCount'].set('channel', 1);
      (client as any).isManuallyClosed = false;
      (client as any).subClient = emitter;

      client.registerEndListener(emitter as any);

      expect(client['routingMap'].size).toBe(0);
      expect(client['subscriptionsCount'].size).toBe(0);
      expect(callback).toHaveBeenCalledWith({
        err: expect.objectContaining({ message: 'Connection closed' }),
      });
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
    it('should register "message" event when returnBuffers is not set', () => {
      const onSpy = vi.fn();
      const client = new ClientRedis({});
      const untypedClient = client as any;
      const emitter = {
        on: onSpy,
      };

      untypedClient.wasInitialConnectionSuccessful = false;
      untypedClient.subClient = emitter;

      client.registerReadyListener(emitter as any);
      const readyHandler = onSpy.mock.calls[0][1];
      readyHandler();

      expect(onSpy).toHaveBeenCalledTimes(2);
      expect(onSpy.mock.calls[1][0]).toEqual('message');
    });
    it('should register "message" event when returnBuffers is false', () => {
      const onSpy = vi.fn();
      const client = new ClientRedis({ returnBuffers: false });
      const untypedClient = client as any;

      const emitter = {
        on: onSpy,
      };

      untypedClient.wasInitialConnectionSuccessful = false;
      untypedClient.subClient = emitter;

      client.registerReadyListener(emitter as any);
      const readyHandler = onSpy.mock.calls[0][1];
      readyHandler();

      expect(onSpy).toHaveBeenCalledTimes(2);
      expect(onSpy.mock.calls[1][0]).toEqual('message');
    });
    it('should register "messageBuffer" event when returnBuffers is true', () => {
      const onSpy = vi.fn();
      const clientWithBuffers = new ClientRedis({ returnBuffers: true });
      const untypedClientWithBuffers = clientWithBuffers as any;

      const emitter = {
        on: onSpy,
      };

      untypedClientWithBuffers.wasInitialConnectionSuccessful = false;
      untypedClientWithBuffers.subClient = emitter;

      clientWithBuffers.registerReadyListener(emitter as any);
      const readyHandler = onSpy.mock.calls[0][1];
      readyHandler();

      expect(onSpy).toHaveBeenCalledTimes(2);
      expect(onSpy.mock.calls[1][0]).toEqual('messageBuffer');
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

  describe('createClient', () => {
    it('should not set clientInfoTag when not provided', async () => {
      const clientWithoutTag = new ClientRedis({});
      const redisClient = await clientWithoutTag.createClient();

      expect(redisClient).toBeTruthy();
      // Verify no clientInfoTag was set (opt-in only)
      expect(redisClient.options.clientInfoTag).toBeUndefined();
    });

    it('should use clientInfoTag when provided', async () => {
      const clientWithTag = new ClientRedis({ clientInfoTag: 'my-app' });
      const redisClient = await clientWithTag.createClient();

      expect(redisClient).toBeTruthy();
      // Verify the clientInfoTag was used
      expect(redisClient.options.clientInfoTag).toBe('my-app');
    });
  });
});
