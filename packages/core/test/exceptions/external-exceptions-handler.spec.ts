import { of } from 'rxjs';
import * as sinon from 'sinon';
import { ExternalExceptionsHandler } from '../../exceptions/external-exceptions-handler';

describe('ExternalExceptionsHandler', () => {
  let handler: ExternalExceptionsHandler;

  beforeEach(() => {
    handler = new ExternalExceptionsHandler();
  });

  describe('next', () => {
    it('should method returns expected stream with message when exception is unknown', async () => {
      const error = new Error();
      try {
        await handler.next(error, null);
      } catch (err) {
        expect(err).toEqual(error);
      }
    });
    describe('when "invokeCustomFilters" returns value', () => {
      const observable$ = of(true);
      beforeEach(() => {
        sinon.stub(handler, 'invokeCustomFilters').returns(observable$ as any);
      });
      it('should return observable', () => {
        const result = handler.next(new Error(), null);
        expect(result).toEqual(observable$);
      });
    });
  });
  describe('setCustomFilters', () => {
    const filters = ['test', 'test2'];
    it('should set custom filters', () => {
      handler.setCustomFilters(filters as any);
      expect((handler as any).filters).toEqual(filters);
    });
    it('should throws exception when passed argument is not an array', () => {
      expect(() => handler.setCustomFilters(null)).toThrow();
    });
  });
  describe('invokeCustomFilters', () => {
    describe('when filters array is empty', () => {
      it('should return identity', () => {
        expect(handler.invokeCustomFilters(null, null)).toBeNull();
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
          expect(funcSpy.notCalled).toBeFalsy();
        });
        it('should call funcSpy with exception and response passed as an arguments', () => {
          const exception = new TestException();
          handler.invokeCustomFilters(exception, null);
          expect(funcSpy.calledWith(exception)).toBeTruthy();
        });
        it('should return stream', () => {
          expect(
            handler.invokeCustomFilters(new TestException(), null),
          ).not.toBeNull();
        });
      });
      describe('when filter does not exists in filters array', () => {
        it('should not call funcSpy', () => {
          handler.invokeCustomFilters(new TestException(), null);
          expect(funcSpy.notCalled).toBeTruthy();
        });
        it('should return null', () => {
          expect(
            handler.invokeCustomFilters(new TestException(), null),
          ).toBeNull();
        });
      });
    });
  });
});
