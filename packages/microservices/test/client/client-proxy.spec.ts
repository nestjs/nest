import { expect } from 'chai';
import { Observable } from 'rxjs';
import * as sinon from 'sinon';
import { ClientProxy } from '../../client/client-proxy.js';
import pkg from '../../interfaces/index.js';
const { ReadPacket } = pkg;

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

class CachingTestClientProxy extends TestClientProxy {
  protected shouldCacheDispatch(): boolean {
    return true;
  }
}

describe('ClientProxy', function () {
  this.retries(10);

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
        expect(error.calledWith(err)).to.be.true;
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
        expect(next.calledWith(data)).to.be.true;
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
        expect(complete.called).to.be.true;
      });
    });
  });

  describe('send', () => {
    it(`should return an observable stream`, () => {
      const stream$ = client.send({}, '');
      expect(stream$ instanceof Observable).to.be.true;
    });
    it('should call "connect" on subscribe', () => {
      const connectSpy = sinon.spy(client, 'connect');
      const stream$ = client.send({ test: 3 }, 'test');

      stream$.subscribe();
      expect(connectSpy.calledOnce).to.be.true;
    });
    describe('when "connect" throws', () => {
      it('should return Observable with error', () => {
        sinon.stub(client, 'connect').callsFake(() => {
          throw new Error();
        });
        const stream$ = client.send({ test: 3 }, 'test');
        stream$.subscribe({
          next: () => {},
          error: err => {
            expect(err).to.be.instanceof(Error);
          },
        });
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
          expect(publishSpy.calledOnce).to.be.true;
        });
      });
    });
    it('should return Observable with error', () => {
      const err$ = client.send(null, null);
      expect(err$).to.be.instanceOf(Observable);
    });
  });

  describe('emit', () => {
    it(`should return an observable stream`, () => {
      const stream$ = client.emit({}, '');
      expect(stream$ instanceof Observable).to.be.true;
    });
    it('should call "connect" immediately', () => {
      const connectSpy = sinon.spy(client, 'connect');
      client.emit({ test: 3 }, 'test');
      expect(connectSpy.calledOnce).to.be.true;
    });
    describe('when "connect" throws', () => {
      it('should return Observable with error', () => {
        sinon.stub(client, 'connect').callsFake(() => {
          throw new Error();
        });
        const stream$ = client.emit({ test: 3 }, 'test');
        stream$.subscribe({
          next: () => {},
          error: err => {
            expect(err).to.be.instanceof(Error);
          },
        });
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
          expect(dispatchEventSpy.calledOnce).to.be.true;
        });
      });
    });
    it('should return Observable with error', () => {
      const err$ = client.emit(null, null);
      expect(err$).to.be.instanceOf(Observable);
    });
  });

  describe('shouldCacheDispatch', () => {
    it('should return false by default', () => {
      const testClient = new TestClientProxy();
      expect(testClient['shouldCacheDispatch']()).to.be.false;
    });

    it('should allow overriding in subclasses', () => {
      const cachingClient = new CachingTestClientProxy();
      expect(cachingClient['shouldCacheDispatch']()).to.be.true;
    });
  });

  describe('emit with caching', () => {
    let cachingClient: CachingTestClientProxy;
    let connectSpy: sinon.SinonSpy;
    let dispatchEventSpy: sinon.SinonSpy;

    beforeEach(() => {
      cachingClient = new CachingTestClientProxy();
      connectSpy = sinon
        .stub(cachingClient, 'connect')
        .callsFake(() => Promise.resolve());
      dispatchEventSpy = sinon
        .stub(cachingClient, 'dispatchEvent')
        .callsFake(() => Promise.resolve('test-result'));
    });

    it('should return an observable when caching is enabled', () => {
      const pattern = { test: 1 };
      const data = 'test-data';

      const stream$ = cachingClient.emit(pattern, data);
      expect(stream$).to.be.instanceOf(Observable);
    });

    it('should call connect when emit is called', done => {
      const pattern = { test: 2 };
      const data = 'test-data-2';

      const stream$ = cachingClient.emit(pattern, data);

      stream$.subscribe({
        next: () => {
          expect(connectSpy.calledOnce).to.be.true;
          done();
        },
        error: done,
      });
    });

    it('should call dispatchEvent when emit is called', done => {
      const pattern = { test: 3 };
      const data = 'test-data-3';

      const stream$ = cachingClient.emit(pattern, data);

      stream$.subscribe({
        next: () => {
          expect(dispatchEventSpy.calledOnce).to.be.true;
          done();
        },
        error: done,
      });
    });

    it('should cache dispatch observable for multiple subscriptions to same emit', done => {
      const pattern = { test: 'multi' };
      const data = 'data';

      // Reset the stubs to get fresh call counts
      connectSpy.resetHistory();
      dispatchEventSpy.resetHistory();

      const obs$ = cachingClient.emit(pattern, data);

      // Multiple subscriptions to the same observable should not re-dispatch
      obs$.subscribe();
      obs$.subscribe();

      setTimeout(() => {
        expect(connectSpy.calledOnce).to.be.true; // Connect should only be called once
        expect(dispatchEventSpy.calledOnce).to.be.true; // Dispatch should only be called once
        done();
      }, 10);
    });

    it('should not re-dispatch for multiple subscriptions when caching is enabled', done => {
      const pattern = { test: 'multi-sub' };
      const data = 'data';

      // Reset the stubs to get fresh call counts
      connectSpy.resetHistory();
      dispatchEventSpy.resetHistory();

      let subscriptionCount = 0;

      const obs$ = cachingClient.emit(pattern, data);

      const checkComplete = () => {
        subscriptionCount++;
        if (subscriptionCount === 2) {
          expect(dispatchEventSpy.calledOnce).to.be.true;
          done();
        }
      };

      obs$.subscribe({
        next: checkComplete,
        error: done,
        complete: checkComplete,
      });

      obs$.subscribe({
        next: checkComplete,
        error: done,
        complete: checkComplete,
      }); // Second subscriber
    });

    it('should handle multiple different patterns without caching conflicts', done => {
      const pattern1 = { test: 'pattern1' };
      const pattern2 = { test: 'pattern2' };
      const data = 'data';

      // Reset the stubs to get fresh call counts
      connectSpy.resetHistory();
      dispatchEventSpy.resetHistory();

      // Each different pattern should create its own observable
      cachingClient.emit(pattern1, data).subscribe();
      cachingClient.emit(pattern2, data).subscribe();

      setTimeout(() => {
        expect(connectSpy.calledTwice).to.be.true; // Connect called for each pattern
        expect(dispatchEventSpy.calledTwice).to.be.true; // Dispatch called for each pattern
        done();
      }, 10);
    });

    it('should handle error scenarios gracefully when caching is enabled', done => {
      const pattern = { test: 'error' };
      const data = 'data';

      // Reset the stubs and make connect throw an error
      connectSpy.resetHistory();
      dispatchEventSpy.resetHistory();
      connectSpy.callsFake(() =>
        Promise.reject(new Error('Connection failed')),
      );

      const stream$ = cachingClient.emit(pattern, data);

      stream$.subscribe({
        next: () => done(new Error('Should not emit next')),
        error: err => {
          expect(err.message).to.equal('Connection failed');
          expect(connectSpy.calledOnce).to.be.true;
          done();
        },
      });
    });
  });
});
