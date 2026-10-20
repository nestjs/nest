import { of } from 'rxjs';
import { ExternalExceptionFilter } from '../../exceptions/external-exception-filter.js';
import { ExternalExceptionsHandler } from '../../exceptions/external-exceptions-handler.js';

describe('ExternalExceptionsHandler', () => {
  let handler: ExternalExceptionsHandler;

  beforeEach(() => {
    handler = new ExternalExceptionsHandler();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore The 'logger' property is private but we want to avoid showing useless error logs
    ExternalExceptionFilter.logger.error = () => {};
  });

  describe('next', () => {
    it('should method returns expected stream with message when exception is unknown', () => {
      const error = new Error();
      expect(() => handler.next(error, null!)).toThrow(error);
    });
    describe('when "invokeCustomFilters" returns value', () => {
      const observable$ = of(true);
      beforeEach(() => {
        vi.spyOn(handler, 'invokeCustomFilters').mockReturnValue(
          observable$ as any,
        );
      });
      it('should return observable', () => {
        const result = handler.next(new Error(), null!);
        expect(result).toEqual(observable$);
      });
    });
    describe('when a filter catches the exception', () => {
      class TestException extends Error {}

      it.each([null, false, 0, ''])(
        'should return %j when the filter returns it',
        value => {
          handler.setCustomFilters([
            { exceptionMetatypes: [TestException], func: () => value },
          ]);
          expect(handler.next(new TestException(), null!)).toBe(value);
        },
      );
      it('should rethrow the exception when the filter returns nothing', () => {
        const exception = new TestException('unhandled');
        handler.setCustomFilters([
          { exceptionMetatypes: [TestException], func: () => undefined },
        ]);
        expect(() => handler.next(exception, null!)).toThrow(exception);
      });
    });
    describe('when no filter catches the exception', () => {
      it('should rethrow the exception', () => {
        class AnotherTestException {}
        const exception = new Error('uncaught');
        handler.setCustomFilters([
          { exceptionMetatypes: [AnotherTestException], func: () => null },
        ]);
        expect(() => handler.next(exception, null!)).toThrow(exception);
      });
    });
  });
  describe('setCustomFilters', () => {
    const filters = ['test', 'test2'];
    it('should set custom filters', () => {
      handler.setCustomFilters(filters as any);
      expect((handler as any).filters).toEqual(filters);
    });
    it('should throw exception when passed argument is not an array', () => {
      expect(() => handler.setCustomFilters(null!)).toThrow();
    });
  });
  describe('invokeCustomFilters', () => {
    describe('when filters array is empty', () => {
      it('should return undefined', () => {
        expect(handler.invokeCustomFilters(null, null!)).toBeUndefined();
      });
    });
    describe('when filters array is not empty', () => {
      let filters, funcSpy;
      class TestException {}
      class AnotherTestException {}

      beforeEach(() => {
        funcSpy = vi.fn();
      });
      describe('when filter exists in filters array', () => {
        beforeEach(() => {
          filters = [{ exceptionMetatypes: [TestException], func: funcSpy }];
          (handler as any).filters = filters;
        });
        it('should call funcSpy', async () => {
          await handler.invokeCustomFilters(new TestException(), null!);
          expect(funcSpy).toHaveBeenCalled();
        });
        it('should call funcSpy with exception and response passed as an arguments', async () => {
          const exception = new TestException();
          await handler.invokeCustomFilters(exception, null!);
          expect(funcSpy).toHaveBeenCalledWith(exception, null);
        });
        it('should return stream', () => {
          const stream$ = of(true);
          funcSpy.mockReturnValue(stream$);
          expect(
            handler.invokeCustomFilters(new TestException(), null!),
          ).toBe(stream$);
        });
      });
      describe('when filter does not exists in filters array', () => {
        beforeEach(() => {
          filters = [
            { exceptionMetatypes: [AnotherTestException], func: funcSpy },
          ];
          (handler as any).filters = filters;
        });
        it('should not call funcSpy', async () => {
          await handler.invokeCustomFilters(new TestException(), null!);
          expect(funcSpy).not.toHaveBeenCalled();
        });
        it('should return undefined', () => {
          expect(
            handler.invokeCustomFilters(new TestException(), null!),
          ).toBeUndefined();
        });
      });
    });
  });
});
