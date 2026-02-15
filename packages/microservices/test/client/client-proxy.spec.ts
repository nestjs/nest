import { Observable } from 'rxjs';
import { ClientProxy } from '../../client/client-proxy.js';
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
});
