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
});
