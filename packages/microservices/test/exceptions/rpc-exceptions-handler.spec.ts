import { EMPTY, lastValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RpcException } from '../../exceptions/rpc-exception.js';
import { RpcExceptionsHandler } from '../../exceptions/rpc-exceptions-handler.js';

describe('RpcExceptionsHandler', () => {
  let handler: RpcExceptionsHandler;

  beforeEach(() => {
    handler = new RpcExceptionsHandler();
  });

  describe('handle', () => {
    it('should method returns expected stream with message when exception is unknown', () =>
      new Promise<void>(done => {
        const stream$ = handler.handle(new Error(), null!);
        stream$
          .pipe(
            catchError((err: any) => {
              expect(err).toEqual({
                status: 'error',
                message: 'Internal server error',
              });
              done();
              return EMPTY;
            }),
          )
          .subscribe(() => ({}));
      }));
    describe('when exception is instance of WsException', () => {
      it('should method emit expected status and json object', () =>
        new Promise<void>(done => {
          const message = {
            custom: 'Unauthorized',
          };
          const stream$ = handler.handle(new RpcException(message), null!);
          stream$
            .pipe(
              catchError((err: any) => {
                expect(err).toEqual(message);
                done();
                return EMPTY;
              }),
            )
            .subscribe(() => ({}));
        }));
      it('should method emit expected status and transform message to json', () =>
        new Promise<void>(done => {
          const message = 'Unauthorized';

          const stream$ = handler.handle(new RpcException(message), null!);
          stream$
            .pipe(
              catchError((err: any) => {
                expect(err).toEqual({ message, status: 'error' });
                done();
                return EMPTY;
              }),
            )
            .subscribe(() => ({}));
        }));
    });
    describe('when "invokeCustomFilters" returns observable', () => {
      const observable$ = of(true);
      beforeEach(() => {
        vi.spyOn(handler, 'invokeCustomFilters').mockReturnValue(observable$);
      });
      it('should return observable', () => {
        const result = handler.handle(new RpcException(''), null!);
        expect(result).toEqual(observable$);
      });
    });
    describe('when a filter catches the exception', () => {
      class TestException extends RpcException {}

      it.each([null, false, 0, ''])(
        'should emit %j when the filter returns it',
        async value => {
          handler.setCustomFilters([
            { exceptionMetatypes: [TestException], func: () => value as any },
          ]);
          const result$ = handler.handle(new TestException('test'), null!);
          expect(await lastValueFrom(result$)).toBe(value);
        },
      );
      it('should handle the exception itself when the filter returns nothing', async () => {
        handler.setCustomFilters([
          { exceptionMetatypes: [TestException], func: () => undefined as any },
        ]);
        await expect(
          lastValueFrom(handler.handle(new TestException('test'), null!)),
        ).rejects.toEqual({ status: 'error', message: 'test' });
      });
    });
    describe('when no filter catches the exception', () => {
      it('should handle the exception itself', async () => {
        class AnotherTestException {}
        handler.setCustomFilters([
          {
            exceptionMetatypes: [AnotherTestException],
            func: () => null as any,
          },
        ]);
        await expect(
          lastValueFrom(handler.handle(new RpcException('test'), null!)),
        ).rejects.toEqual({ status: 'error', message: 'test' });
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

      beforeEach(() => {
        funcSpy = vi.fn();
      });
      describe('when filter exists in filters array', () => {
        beforeEach(() => {
          filters = [{ exceptionMetatypes: [TestException], func: funcSpy }];
          (handler as any).filters = filters;
        });
        it('should call funcSpy', () => {
          handler.invokeCustomFilters(new TestException(), null!);
          expect(funcSpy).toHaveBeenCalled();
        });
        it('should call funcSpy with exception and response passed as an arguments', () => {
          const exception = new TestException();
          handler.invokeCustomFilters(exception, null!);
          expect(funcSpy).toHaveBeenCalledWith(exception, null);
        });
        it('should return stream', () => {
          const stream$ = of(true);
          funcSpy.mockReturnValue(stream$);
          expect(handler.invokeCustomFilters(new TestException(), null!)).toBe(
            stream$,
          );
        });
      });
      describe('when filter does not exists in filters array', () => {
        it('should not call funcSpy', () => {
          handler.invokeCustomFilters(new TestException(), null!);
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
