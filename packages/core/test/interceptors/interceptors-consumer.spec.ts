import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { expect } from 'chai';
import { Observable, lastValueFrom, of } from 'rxjs';
import * as sinon from 'sinon';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer';

describe('InterceptorsConsumer', () => {
  let consumer: InterceptorsConsumer;
  let interceptors: any[];
  beforeEach(() => {
    consumer = new InterceptorsConsumer();
    interceptors = [
      {
        intercept: sinon.stub().callsFake((ctx, handler) => handler.handle()),
      },
      {
        intercept: sinon
          .stub()
          .callsFake(async (ctx, handler) => handler.handle()),
      },
    ];
  });
  describe('intercept', () => {
    describe('when interceptors array is empty', () => {
      let next: sinon.SinonSpy;
      beforeEach(() => {
        next = sinon.spy();
      });
      it('should call next()', async () => {
        await consumer.intercept([], null, { constructor: null }, null, next);
        expect(next.calledOnce).to.be.true;
      });
    });
    describe('when interceptors array is not empty', () => {
      let next: sinon.SinonSpy;
      beforeEach(() => {
        next = sinon.stub().returns(Promise.resolve(''));
      });
      it('does not call `intercept` (lazy evaluation)', async () => {
        await consumer.intercept(
          interceptors,
          null,
          { constructor: null },
          null,
          next,
        );

        expect(interceptors[0].intercept.called).to.be.false;
        expect(interceptors[1].intercept.called).to.be.false;
      });
      it('should call every `intercept` method when subscribe', async () => {
        const intercepted = await consumer.intercept(
          interceptors,
          null,
          { constructor: null },
          null,
          next,
        );
        await transformToResult(intercepted);

        expect(interceptors[0].intercept.calledOnce).to.be.true;
        expect(interceptors[1].intercept.calledOnce).to.be.true;
      });
      it('should not call `next` (lazy evaluation)', async () => {
        await consumer.intercept(
          interceptors,
          null,
          { constructor: null },
          null,
          next,
        );
        expect(next.called).to.be.false;
      });
      it('should call `next` when subscribe', async () => {
        const intercepted = await consumer.intercept(
          interceptors,
          null,
          { constructor: null },
          null,
          next,
        );
        await transformToResult(intercepted);
        expect(next.called).to.be.true;
      });
    });

    describe('AsyncLocalStorage', () => {
      it('Allows an interceptor to set values in AsyncLocalStorage that are accesible from the controller', async () => {
        const storage = new AsyncLocalStorage<Record<string, any>>();
        class StorageInterceptor implements NestInterceptor {
          intercept(
            _context: ExecutionContext,
            next: CallHandler<any>,
          ): Observable<any> | Promise<Observable<any>> {
            return storage.run({ value: 'hello' }, () => next.handle());
          }
        }
        const next = () => Promise.resolve(storage.getStore().value);
        const intercepted = await consumer.intercept(
          [new StorageInterceptor()],
          null,
          { constructor: null },
          null,
          next,
        );
        const result = await transformToResult(intercepted);
        expect(result).to.equal('hello');
      });
    });
  });
  describe('createContext', () => {
    it('should return execution context object', () => {
      const instance = { constructor: {} };
      const callback = () => null;
      const context = consumer.createContext([], instance, callback);

      expect(context.getClass()).to.be.eql(instance.constructor);
      expect(context.getHandler()).to.be.eql(callback);
    });
  });
  describe('transformDeferred', () => {
    describe('when next() result is plain value', () => {
      it('should return Observable', async () => {
        const val = 3;
        const next = async () => val;
        expect(await lastValueFrom(consumer.transformDeferred(next))).to.be.eql(
          val,
        );
      });
    });
    describe('when next() result is Promise', () => {
      it('should return Observable', async () => {
        const val = 3;
        const next = async () => val;
        expect(await lastValueFrom(consumer.transformDeferred(next))).to.be.eql(
          val,
        );
      });
    });
    describe('when next() result is Observable', () => {
      it('should return Observable', async () => {
        const val = 3;
        const next = async () => of(val);
        expect(
          await await lastValueFrom(consumer.transformDeferred(next) as any),
        ).to.be.eql(val);
      });
    });
  });
});

async function transformToResult(resultOrDeferred: any) {
  if (resultOrDeferred && typeof resultOrDeferred.subscribe === 'function') {
    return lastValueFrom(resultOrDeferred);
  }
  return resultOrDeferred;
}
