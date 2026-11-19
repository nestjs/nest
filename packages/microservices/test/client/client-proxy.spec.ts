import { firstValueFrom, Observable } from 'rxjs';
import { ClientKafka } from '../../client/client-kafka.js';
import { ClientMqtt } from '../../client/client-mqtt.js';
import { ClientNats } from '../../client/client-nats.js';
import { ClientProxy } from '../../client/client-proxy.js';
import { ClientRedis } from '../../client/client-redis.js';
import { ClientRMQ } from '../../client/client-rmq.js';
import { ClientTCP } from '../../client/client-tcp.js';
import {
  ClientRequestTimeoutException,
  MaxPendingRequestsExceededException,
} from '../../exceptions/index.js';
import { ReadPacket } from '../../interfaces/index.js';

class TestClientProxy extends ClientProxy {
  protected async dispatchEvent<T = any>(
    packet: ReadPacket<any>,
  ): Promise<any> {}

  public async connect() {
    return Promise.resolve();
  }

  public unwrap<T>(): T {
    throw new Error('Method not implemented.');
  }

  public publish(pattern, callback): any {}
  public async close() {}
}

describe('ClientProxy', function () {
  let client: TestClientProxy;
  beforeEach(() => {
    client = new TestClientProxy();
  });

  describe('createObserver', () => {
    describe('returned function calls', () => {
      it(`"error" when first parameter is not null or undefined`, () => {
        const testClient = new TestClientProxy();
        const err = 'test';
        const error = vi.fn();
        const next = vi.fn();
        const complete = vi.fn();
        const observer = {
          error,
          next,
          complete,
        };
        const fn = testClient['createObserver'](observer);

        fn({ err });
        expect(error).toHaveBeenCalledWith(err);
      });

      it(`"next" when first parameter is null or undefined`, () => {
        const testClient = new TestClientProxy();
        const data = 'test';
        const error = vi.fn();
        const next = vi.fn();
        const complete = vi.fn();
        const observer = {
          error,
          next,
          complete,
        };
        const fn = testClient['createObserver'](observer);

        fn({ response: data });
        expect(next).toHaveBeenCalledWith(data);
      });

      it(`"complete" when third parameter is true`, () => {
        const testClient = new TestClientProxy();
        const data = 'test';
        const error = vi.fn();
        const next = vi.fn();
        const complete = vi.fn();
        const observer = {
          error,
          next,
          complete,
        };
        const fn = testClient['createObserver'](observer);

        fn({ data, isDisposed: true } as any);
        expect(complete).toHaveBeenCalled();
      });
    });
  });

  describe('send', () => {
    it(`should return an observable stream`, () => {
      const stream$ = client.send({}, '');
      expect(stream$ instanceof Observable).toBe(true);
    });
    it('should call "connect" on subscribe', () => {
      const connectSpy = vi.spyOn(client, 'connect');
      const stream$ = client.send({ test: 3 }, 'test');

      stream$.subscribe();
      expect(connectSpy).toHaveBeenCalledOnce();
    });
    describe('when "connect" throws', () => {
      it('should return Observable with error', () => {
        vi.spyOn(client, 'connect').mockImplementation(() => {
          throw new Error();
        });
        const stream$ = client.send({ test: 3 }, 'test');
        stream$.subscribe({
          next: () => {},
          error: err => {
            expect(err).toBeInstanceOf(Error);
          },
        });
      });
    });
    describe('when is connected', () => {
      beforeEach(() => {
        vi.spyOn(client, 'connect').mockImplementation(() => Promise.resolve());
      });
      it(`should call "publish"`, () => {
        const pattern = { test: 3 };
        const data = 'test';
        const publishSpy = vi.fn();
        const stream$ = client.send(pattern, data);
        client.publish = publishSpy;

        stream$.subscribe(() => {
          expect(publishSpy).toHaveBeenCalledOnce();
        });
      });
    });
    it('should return Observable with error', () => {
      const err$ = client.send(null, null);
      expect(err$).toBeInstanceOf(Observable);
    });
  });

  describe('setOnDispatchHook', () => {
    const metadata = { traceId: 'trace-1' };

    it('should let the hook attach metadata to an outgoing request', () => {
      const publishSpy = vi.spyOn(client, 'publish');
      client.setOnDispatchHook(packet => {
        packet.metadata = metadata;
      });

      client.send('pattern', 'data').subscribe();

      return new Promise<void>(resolve =>
        setImmediate(() => {
          expect(publishSpy.mock.calls[0][0]).toEqual({
            pattern: 'pattern',
            data: 'data',
            metadata,
          });
          resolve();
        }),
      );
    });

    it('should let the hook attach metadata to an outgoing event', async () => {
      const dispatchSpy = vi.spyOn(client as any, 'dispatchEvent');
      client.setOnDispatchHook(packet => {
        packet.metadata = metadata;
      });

      await firstValueFrom(client.emit('pattern', 'data'), {
        defaultValue: undefined,
      });

      expect(dispatchSpy).toHaveBeenCalledWith({
        pattern: 'pattern',
        data: 'data',
        metadata,
      });
    });

    it('should send the packet unchanged when no hook is set', async () => {
      const dispatchSpy = vi.spyOn(client as any, 'dispatchEvent');

      await firstValueFrom(client.emit('pattern', 'data'), {
        defaultValue: undefined,
      });

      expect(dispatchSpy).toHaveBeenCalledWith({
        pattern: 'pattern',
        data: 'data',
      });
    });
  });

  describe('emit', () => {
    it(`should return an observable stream`, () => {
      const stream$ = client.emit({}, '');
      expect(stream$ instanceof Observable).toBe(true);
    });
    it('should call "connect" immediately', () => {
      const connectSpy = vi.spyOn(client, 'connect');
      client.emit({ test: 3 }, 'test');
      expect(connectSpy).toHaveBeenCalledOnce();
    });
    describe('when "connect" throws', () => {
      it('should return Observable with error', () => {
        vi.spyOn(client, 'connect').mockImplementation(() => {
          throw new Error();
        });
        const stream$ = client.emit({ test: 3 }, 'test');
        stream$.subscribe({
          next: () => {},
          error: err => {
            expect(err).toBeInstanceOf(Error);
          },
        });
      });
    });
    describe('when is connected', () => {
      beforeEach(() => {
        vi.spyOn(client, 'connect').mockImplementation(() => Promise.resolve());
      });
      it(`should call "dispatchEvent"`, () => {
        const pattern = { test: 3 };
        const data = 'test';
        const dispatchEventSpy = vi
          .fn()
          .mockImplementation(() => Promise.resolve(true));
        const stream$ = client.emit(pattern, data);
        client['dispatchEvent'] = dispatchEventSpy;

        stream$.subscribe(() => {
          expect(dispatchEventSpy).toHaveBeenCalledOnce();
        });
      });
    });
    it('should return Observable with error', () => {
      const err$ = client.emit(null, null);
      expect(err$).toBeInstanceOf(Observable);
    });
  });

  describe('createObserver', () => {
    it('should call next then complete when response is defined and isDisposed is true', () => {
      const next = vi.fn();
      const complete = vi.fn();
      const error = vi.fn();
      const fn = client['createObserver']({ next, complete, error } as any);
      fn({ response: 'data', isDisposed: true });
      expect(next).toHaveBeenCalledWith('data');
      expect(complete).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });

    it('should call only complete when response is undefined and isDisposed is true', () => {
      const next = vi.fn();
      const complete = vi.fn();
      const error = vi.fn();
      const fn = client['createObserver']({ next, complete, error } as any);
      fn({ isDisposed: true });
      expect(next).not.toHaveBeenCalled();
      expect(complete).toHaveBeenCalled();
    });
  });

  describe('serializeError', () => {
    it('should return error as-is (identity)', () => {
      const err = new Error('test');
      expect(client['serializeError'](err)).toBe(err);
    });
  });

  describe('serializeResponse', () => {
    it('should return response as-is (identity)', () => {
      const response = { data: 42 };
      expect(client['serializeResponse'](response)).toBe(response);
    });
  });

  describe('assignPacketId', () => {
    it('should add an id property to the packet', () => {
      const packet = { pattern: 'test', data: {} };
      const result = client['assignPacketId'](packet);
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.pattern).toBe('test');
    });

    it('should not derive an id from the ids before it', () => {
      // A reply is matched by its id alone, so a peer that answers one request
      // must not be able to guess the ids of the others
      const [first, second, third] = Array.from(
        { length: 3 },
        () => client['assignPacketId']({ pattern: 'test', data: {} }).id,
      );

      expect(second.startsWith(first.slice(1))).toBe(false);
      expect(third.startsWith(second.slice(1))).toBe(false);
    });
  });

  describe('normalizePattern', () => {
    it('should transform object pattern to route string', () => {
      const result = client['normalizePattern']({ cmd: 'test' });
      expect(typeof result).toBe('string');
      expect(result).toContain('test');
    });

    it('should pass string pattern through', () => {
      expect(client['normalizePattern']('my-pattern')).toBe('my-pattern');
    });
  });

  describe('initializeSerializer', () => {
    it('should use IdentitySerializer when no serializer option', () => {
      client['initializeSerializer']({} as any);
      expect(client['serializer']).toBeDefined();
    });

    it('should use IdentitySerializer when options is undefined', () => {
      client['initializeSerializer'](undefined as any);
      expect(client['serializer']).toBeDefined();
    });

    it('should use provided serializer from options', () => {
      const customSerializer = { serialize: vi.fn() };
      client['initializeSerializer']({ serializer: customSerializer } as any);
      expect(client['serializer']).toBe(customSerializer);
    });
  });

  describe('initializeDeserializer', () => {
    it('should use IncomingResponseDeserializer when no deserializer option', () => {
      client['initializeDeserializer']({} as any);
      expect(client['deserializer']).toBeDefined();
    });

    it('should use IncomingResponseDeserializer when options is undefined', () => {
      client['initializeDeserializer'](undefined as any);
      expect(client['deserializer']).toBeDefined();
    });

    it('should use provided deserializer from options', () => {
      const customDeserializer = { deserialize: vi.fn() };
      client['initializeDeserializer']({
        deserializer: customDeserializer,
      } as any);
      expect(client['deserializer']).toBe(customDeserializer);
    });
  });

  describe('getOptionsProp', () => {
    it('should return value when prop exists', () => {
      const options = { host: 'localhost', port: 3000 };
      expect(client['getOptionsProp'](options as any, 'host' as any)).toBe(
        'localhost',
      );
    });

    it('should return defaultValue when prop does not exist', () => {
      const options = {} as any;
      expect(
        client['getOptionsProp'](options, 'host' as any, 'default-host'),
      ).toBe('default-host');
    });

    it('should return undefined defaultValue when obj is falsy', () => {
      expect(
        client['getOptionsProp'](undefined as any, 'host' as any, 'fallback'),
      ).toBe('fallback');
    });
  });

  describe('status', () => {
    it('should return an observable', () => {
      expect(client.status).toBeDefined();
      expect(client.status.subscribe).toBeDefined();
    });
  });

  describe('on', () => {
    it('should throw "Method not implemented." error', () => {
      expect(() => client.on('event' as any, (() => {}) as any)).toThrow(
        'Method not implemented.',
      );
    });
  });

  describe('routingMap', () => {
    it('should be a Map instance', () => {
      expect(client['routingMap']).toBeInstanceOf(Map);
    });
  });

  describe('requestTimeout and maxPendingRequests', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should fail with ClientRequestTimeoutException and invoke publish teardown when response times out', async () => {
      vi.useFakeTimers();
      client['initializeRequestOptions']({ requestTimeout: 250 } as any);
      const teardown = vi.fn();
      vi.spyOn(client, 'publish').mockReturnValue(teardown);

      const errorSpy = vi.fn();
      client.send('pattern', 'data').subscribe({ error: errorSpy });

      await vi.advanceTimersByTimeAsync(249);
      expect(errorSpy).not.toHaveBeenCalled();
      expect(teardown).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toBeInstanceOf(
        ClientRequestTimeoutException,
      );
      expect(errorSpy.mock.calls[0][0].timeoutMs).toBe(250);
      expect(teardown).toHaveBeenCalledTimes(1);
      expect(client['pendingRequests']).toBe(0);
    });

    it('should fail with ClientRequestTimeoutException when connect() hangs', async () => {
      vi.useFakeTimers();
      client['initializeRequestOptions']({ requestTimeout: 100 } as any);
      vi.spyOn(client, 'connect').mockReturnValue(new Promise(() => {}));

      const errorSpy = vi.fn();
      client.send('pattern', 'data').subscribe({ error: errorSpy });

      await vi.advanceTimersByTimeAsync(100);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toBeInstanceOf(
        ClientRequestTimeoutException,
      );
      expect(client['pendingRequests']).toBe(0);
    });

    it('should refresh timeout on each emission for multi-emission streams', async () => {
      vi.useFakeTimers();
      client['initializeRequestOptions']({ requestTimeout: 100 } as any);
      let emitReply!: (packet: any) => void;
      vi.spyOn(client, 'publish').mockImplementation((_packet, cb) => {
        emitReply = cb;
        return () => {};
      });

      const received: any[] = [];
      const errorSpy = vi.fn();
      const completeSpy = vi.fn();
      client.send('stream', 'data').subscribe({
        next: val => received.push(val),
        error: errorSpy,
        complete: completeSpy,
      });

      await vi.advanceTimersByTimeAsync(80);
      emitReply({ response: 'chunk-1' });
      await vi.advanceTimersByTimeAsync(80);
      emitReply({ response: 'chunk-2', isDisposed: true });

      expect(received).toEqual(['chunk-1', 'chunk-2']);
      expect(errorSpy).not.toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalledTimes(1);
      expect(client['pendingRequests']).toBe(0);
    });

    it('should enforce maxPendingRequests before connect() and decrement before observer.error() so retries succeed', async () => {
      client['initializeRequestOptions']({ maxPendingRequests: 1 } as any);
      let resolveConnect!: () => void;
      const connectSpy = vi
        .spyOn(client, 'connect')
        .mockImplementationOnce(
          () =>
            new Promise<void>(resolve => {
              resolveConnect = resolve;
            }),
        )
        .mockResolvedValue(undefined);

      let firstCallback!: (packet: any) => void;
      vi.spyOn(client, 'publish').mockImplementation((_packet, cb) => {
        firstCallback = cb;
        return () => {};
      });

      // First request increments pendingRequests synchronously before connect() settles
      let retryResult: any;
      const sub1 = client.send('p1', 'd1').subscribe({
        error: () => {
          // Immediate retry inside error handler must see decremented pendingRequests
          client.send('p-retry', 'd-retry').subscribe({
            next: val => (retryResult = val),
          });
        },
      });
      expect(client['pendingRequests']).toBe(1);

      // Second concurrent request fails immediately without calling connect()
      const err2 = vi.fn();
      client.send('p2', 'd2').subscribe({ error: err2 });
      expect(err2).toHaveBeenCalledTimes(1);
      expect(err2.mock.calls[0][0]).toBeInstanceOf(
        MaxPendingRequestsExceededException,
      );
      expect(err2.mock.calls[0][0].maxPendingRequests).toBe(1);
      expect(connectSpy).toHaveBeenCalledTimes(1);

      // Resolve first connect() and fail first request -> retry succeeds
      resolveConnect();
      await new Promise(resolve => setImmediate(resolve));
      firstCallback({ err: new Error('boom') });
      await new Promise(resolve => setImmediate(resolve));
      firstCallback({ response: 'recovered', isDisposed: true });

      expect(retryResult).toBe('recovered');
      expect(client['pendingRequests']).toBe(0);
      sub1.unsubscribe();
    });

    it('should decrement pendingRequests on caller unsubscribe', () => {
      client['initializeRequestOptions']({ maxPendingRequests: 1 } as any);
      vi.spyOn(client, 'connect').mockReturnValue(new Promise(() => {}));

      const sub = client.send('p1', 'd1').subscribe();
      expect(client['pendingRequests']).toBe(1);

      sub.unsubscribe();
      expect(client['pendingRequests']).toBe(0);
    });

    it('should initialize request options across all 6 non-gRPC clients and strip them from Redis options without mutating input', () => {
      const redisInput = {
        host: '127.0.0.1',
        requestTimeout: 500,
        maxPendingRequests: 10,
      };
      const redisClient = new ClientRedis(redisInput);
      const tcpClient = new ClientTCP({
        requestTimeout: 500,
        maxPendingRequests: 10,
      });
      const mqttClient = new ClientMqtt({
        requestTimeout: 500,
        maxPendingRequests: 10,
      });
      const natsClient = new ClientNats({
        requestTimeout: 500,
        maxPendingRequests: 10,
      });
      const rmqClient = new ClientRMQ({
        requestTimeout: 500,
        maxPendingRequests: 10,
      });
      const kafkaClient = new ClientKafka({
        requestTimeout: 500,
        maxPendingRequests: 10,
      });

      for (const c of [
        redisClient,
        tcpClient,
        mqttClient,
        natsClient,
        rmqClient,
        kafkaClient,
      ]) {
        expect(c['requestTimeout']).toBe(500);
        expect(c['maxPendingRequests']).toBe(10);
      }

      const redisSdkOptions = redisClient.getClientOptions();
      expect(redisSdkOptions).not.toHaveProperty('requestTimeout');
      expect(redisSdkOptions).not.toHaveProperty('maxPendingRequests');
      // Input options object must not be mutated
      expect(redisInput.requestTimeout).toBe(500);
      expect(redisInput.maxPendingRequests).toBe(10);
    });
  });
});
