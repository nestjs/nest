import { expect } from 'chai';
import { EMPTY as empty, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as sinon from 'sinon';
import { RpcException } from '../../exceptions/rpc-exception';
import { RpcExceptionsHandler } from '../../exceptions/rpc-exceptions-handler';

describe('RpcExceptionsHandler', () => {
  let handler: RpcExceptionsHandler;

  beforeEach(() => {
    handler = new RpcExceptionsHandler();
  });

  describe('handle', () => {
    it('should method returns expected stream with message when exception is unknown', done => {
      const stream$ = handler.handle(new Error(), null);
      stream$
        .pipe(
          catchError((err: any) => {
            expect(err).to.be.eql({
              status: 'error',
              message: 'Internal server error',
            });
            done();
            return empty;
          }),
        )
        .subscribe(() => ({}));
    });
    describe('when exception is instance of WsException', () => {
      it('should method emit expected status and json object', done => {
        const message = {
          custom: 'Unauthorized',
        };
        const stream$ = handler.handle(new RpcException(message), null);
        stream$
          .pipe(
            catchError((err: any) => {
              expect(err).to.be.eql(message);
              done();
              return empty;
            }),
          )
          .subscribe(() => ({}));
      });
      it('should method emit expected status and transform message to json', done => {
        const message = 'Unauthorized';

        const stream$ = handler.handle(new RpcException(message), null);
        stream$
          .pipe(
            catchError((err: any) => {
              expect(err).to.be.eql({ message, status: 'error' });
              done();
              return empty;
            }),
          )
          .subscribe(() => ({}));
      });
    });
    describe('when "invokeCustomFilters" returns observable', () => {
      const observable$ = of(true);
      beforeEach(() => {
        sinon.stub(handler, 'invokeCustomFilters').returns(observable$);
      });
      it('should return observable', () => {
        const result = handler.handle(new RpcException(''), null);
        expect(result).to.be.eql(observable$);
      });
    });
  });
  describe('setCustomFilters', () => {
    const filters = ['test', 'test2'];
    it('should set custom filters', () => {
      handler.setCustomFilters(filters as any);
      expect((handler as any).filters).to.be.eql(filters);
    });
    it('should throws exception when passed argument is not an array', () => {
      expect(() => handler.setCustomFilters(null)).to.throw();
    });
  });
  describe('invokeCustomFilters', () => {
    describe('when filters array is empty', () => {
      it('should return identity', () => {
        expect(handler.invokeCustomFilters(null, null)).to.be.null;
      });
    });
    describe('when filters array is not empty', () => {
      let filters, funcSpy;
      class TestException {}

      beforeEach(() => {
        funcSpy = sinon.spy();
      });
      describe('when filter exists in filters array', () => {
        beforeEach(() => {
          filters = [{ exceptionMetatypes: [TestException], func: funcSpy }];
          (handler as any).filters = filters;
        });
        it('should call funcSpy', () => {
          handler.invokeCustomFilters(new TestException(), null);
          expect(funcSpy.notCalled).to.be.false;
        });
        it('should call funcSpy with exception and response passed as an arguments', () => {
          const exception = new TestException();
          handler.invokeCustomFilters(exception, null);
          expect(funcSpy.calledWith(exception)).to.be.true;
        });
        it('should return stream', () => {
          expect(handler.invokeCustomFilters(new TestException(), null)).to.be
            .not.null;
        });
      });
      describe('when filter does not exists in filters array', () => {
        it('should not call funcSpy', () => {
          handler.invokeCustomFilters(new TestException(), null);
          expect(funcSpy.notCalled).to.be.true;
        });
        it('should return null', () => {
          expect(handler.invokeCustomFilters(new TestException(), null)).to.be
            .null;
        });
      });
    });
  });
});
