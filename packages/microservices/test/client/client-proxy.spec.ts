import { Observable } from 'rxjs';
import * as sinon from 'sinon';
import { ClientProxy } from '../../client/client-proxy';
import { ReadPacket } from '../../interfaces';

class TestClientProxy extends ClientProxy {
  protected async dispatchEvent<T = any>(
    packet: ReadPacket<any>,
  ): Promise<any> {}
  public async connect() {
    return Promise.resolve();
  }
  public publish(pattern, callback): any {}
  public async close() {}
}

describe('ClientProxy', function () {
  jest.retryTimes(10);

  let client: TestClientProxy;
  beforeEach(() => {
    client = new TestClientProxy();
  });

  describe('createObserver', () => {
    describe('returned function calls', () => {
      it(`"error" when first parameter is not null or undefined`, () => {
        const testClient = new TestClientProxy();
        const err = 'test';
        const error = sinon.spy();
        const next = sinon.spy();
        const complete = sinon.spy();
        const observer = {
          error,
          next,
          complete,
        };
        const fn = testClient['createObserver'](observer);

        fn({ err });
        expect(error.calledWith(err)).toBeTruthy();
      });

      it(`"next" when first parameter is null or undefined`, () => {
        const testClient = new TestClientProxy();
        const data = 'test';
        const error = sinon.spy();
        const next = sinon.spy();
        const complete = sinon.spy();
        const observer = {
          error,
          next,
          complete,
        };
        const fn = testClient['createObserver'](observer);

        fn({ response: data });
        expect(next.calledWith(data)).toBeTruthy();
      });

      it(`"complete" when third parameter is true`, () => {
        const testClient = new TestClientProxy();
        const data = 'test';
        const error = sinon.spy();
        const next = sinon.spy();
        const complete = sinon.spy();
        const observer = {
          error,
          next,
          complete,
        };
        const fn = testClient['createObserver'](observer);

        fn({ data, isDisposed: true } as any);
        expect(complete.called).toBeTruthy();
      });
    });
  });

  describe('send', () => {
    it(`should return an observable stream`, () => {
      const stream$ = client.send({}, '');
      expect(stream$ instanceof Observable).toBeTruthy();
    });
    it('should call "connect" on subscribe', () => {
      const connectSpy = sinon.spy(client, 'connect');
      const stream$ = client.send({ test: 3 }, 'test');

      stream$.subscribe();
      expect(connectSpy.calledOnce).toBeTruthy();
    });
    describe('when "connect" throws', () => {
      it('should return Observable with error', () => {
        sinon.stub(client, 'connect').callsFake(() => {
          throw new Error();
        });
        const stream$ = client.send({ test: 3 }, 'test');
        stream$.subscribe(
          () => {},
          err => {
            expect(err).toBeInstanceOf(Error);
          },
        );
      });
    });
    describe('when is connected', () => {
      beforeEach(() => {
        sinon.stub(client, 'connect').callsFake(() => Promise.resolve());
      });
      it(`should call "publish"`, () => {
        const pattern = { test: 3 };
        const data = 'test';
        const publishSpy = sinon.spy();
        const stream$ = client.send(pattern, data);
        client.publish = publishSpy;

        stream$.subscribe(() => {
          expect(publishSpy.calledOnce).toBeTruthy();
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
      expect(stream$ instanceof Observable).toBeTruthy();
    });
    it('should call "connect" immediately', () => {
      const connectSpy = sinon.spy(client, 'connect');
      client.emit({ test: 3 }, 'test');
      expect(connectSpy.calledOnce).toBeTruthy();
    });
    describe('when "connect" throws', () => {
      it('should return Observable with error', () => {
        sinon.stub(client, 'connect').callsFake(() => {
          throw new Error();
        });
        const stream$ = client.emit({ test: 3 }, 'test');
        stream$.subscribe(
          () => {},
          err => {
            expect(err).toBeInstanceOf(Error);
          },
        );
      });
    });
    describe('when is connected', () => {
      beforeEach(() => {
        sinon.stub(client, 'connect').callsFake(() => Promise.resolve());
      });
      it(`should call "dispatchEvent"`, () => {
        const pattern = { test: 3 };
        const data = 'test';
        const dispatchEventSpy = sinon
          .stub()
          .callsFake(() => Promise.resolve(true));
        const stream$ = client.emit(pattern, data);
        client['dispatchEvent'] = dispatchEventSpy;

        stream$.subscribe(() => {
          expect(dispatchEventSpy.calledOnce).toBeTruthy();
        });
      });
    });
    it('should return Observable with error', () => {
      const err$ = client.emit(null, null);
      expect(err$).toBeInstanceOf(Observable);
    });
  });
});
