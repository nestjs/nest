import { expect } from 'chai';
import { of, Observable } from 'rxjs';
import * as sinon from 'sinon';
import { InterceptorsConsumerLogic } from '../../interceptors/interceptors-consumer-logic';
import { ExecutionContextHost } from '../../helpers/execution-context-host';
import { CallHandler, NestInterceptor } from '../../../common/interfaces';
import { map, first } from 'rxjs/operators';

describe('InterceptorsConsumerLogic', () => {
  let logic: InterceptorsConsumerLogic;
  let interceptors: any[];
  beforeEach(() => {
    logic = new InterceptorsConsumerLogic();
    interceptors = [
      {
        intercept() {},
      },
      {
        intercept() {},
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
        await logic.intercept(null, null, null, null, null, null, next);
        expect(next.calledOnce).to.be.true;
      });
    });
    describe('when interceptors array is not empty', () => {
      let next: sinon.SinonSpy;
      beforeEach(() => {
        next = sinon.spy(() => Promise.resolve(''));
      });
      it('should call interceptorIntercept with expected args', async () => {
        const mockGetContextContext = {};
        const mockExecutionContext = { setType: sinon.stub() };
        const mockCreateContext = sinon
          .stub(logic, 'createContext')
          .returns(mockExecutionContext as any);

        const controller = { constructor: null };
        const callback = () => {};
        const args = ['arg1', 'arg2'];

        const mockGetContext = sinon.stub().returns(mockGetContextContext);
        const interceptorIntercept = sinon
          .stub()
          .callsFake(
            (interceptor: any, context: any, callHandler: CallHandler) => {
              return callHandler.handle();
            },
          );
        await logic.intercept(
          mockGetContext,
          interceptorIntercept,
          interceptors,
          args,
          controller,
          callback,
          next,
          'the type' as any,
        );

        expect(mockCreateContext.calledWithExactly(args, controller, callback))
          .to.be.true;
        expect(mockExecutionContext.setType.calledOnceWith('the type')).to.be
          .true;

        function expectInterceptorIntercept(callNumber: 0 | 1) {
          const interceptorInterceptArgs =
            interceptorIntercept.args[callNumber];
          expect(interceptorInterceptArgs[0]).to.be.equal(
            interceptors[callNumber],
          );
          expect(interceptorInterceptArgs[1]).to.be.equal(
            mockGetContextContext,
          );
          expect(interceptorInterceptArgs[2].handle).to.be.instanceOf(Function);
        }
        expectInterceptorIntercept(0);
        expectInterceptorIntercept(1);
      });
      it('should not call `next` (lazy evaluation)', async () => {
        await logic.intercept(
          context => context,
          (interceptor, context, callHandler) => {
            return callHandler.handle();
          },
          interceptors,
          null,
          { constructor: null },
          null,
          next,
        );
        expect(next.called).to.be.false;
      });
      it('should call `next` when subscribe', async () => {
        async function transformToResult(resultOrDeferred: any) {
          if (
            resultOrDeferred &&
            typeof resultOrDeferred.subscribe === 'function'
          ) {
            return resultOrDeferred.toPromise();
          }
          return resultOrDeferred;
        }

        const intercepted = await logic.intercept(
          context => context,
          (interceptor, context, callHandler) => {
            return callHandler.handle();
          },
          interceptors,
          null,
          { constructor: null },
          null,
          next,
        );
        await transformToResult(intercepted);
        expect(next.called).to.be.true;
      });
      describe('CallHandle', () => {
        interface CallHandleTest {
          interceptors: [NestInterceptor, ...NestInterceptor[]];
          next: () => Promise<any>;
          expectedResult: any[];
          description: string;
        }
        const callHandleTests: CallHandleTest[] = [
          {
            description: 'single observable value',
            next() {
              return Promise.resolve({ hello: 'world' });
            },
            expectedResult: [{ bonjour: 'world' }],
            interceptors: [
              {
                intercept(c, callHandler) {
                  return callHandler.handle().pipe(
                    map(v => {
                      return {
                        bonjour: v.hello,
                      };
                    }),
                  );
                },
              },
            ],
          },
          {
            description: 'interceptor map multiple values',
            next() {
              return Promise.resolve(of('first', 'second', 'last'));
            },
            expectedResult: ['is first', 'is second', 'is last'],
            interceptors: [
              {
                intercept(c, callHandler) {
                  return callHandler.handle().pipe(
                    map(v => {
                      return 'is ' + v;
                    }),
                  );
                },
              },
            ],
          },
          {
            description: 'interceptor map multiple values to single',
            next() {
              return Promise.resolve(of(1, 2, 3));
            },
            expectedResult: [2],
            interceptors: [
              {
                intercept(c, callHandler) {
                  return callHandler.handle().pipe(first(v => v > 1));
                },
              },
            ],
          },
        ];

        callHandleTests.forEach(cht => {
          it(cht.description, async () => {
            const logic = new InterceptorsConsumerLogic();
            const interceptResult: Observable<any> = await logic.intercept(
              ec => ec,
              (interceptor, c, callHandler) => {
                return interceptor.intercept(c, callHandler);
              },
              cht.interceptors,
              null,
              { constructor: {} },
              null,
              cht.next,
            );

            const subscribePromise = new Promise((resolve, reject) => {
              const values = [];
              interceptResult.subscribe({
                next(value) {
                  values.push(value);
                },
                complete() {
                  resolve(values);
                },
                error(e) {
                  reject(e);
                },
              });
            });
            const observedValues = await subscribePromise;
            expect(observedValues).to.eql(cht.expectedResult);
          });
        });
      });
    });
  });
  describe('createContext', () => {
    it('should returns execution context object', () => {
      const instance = { constructor: {} };
      const callback = () => null;
      const args = ['arg1', 'arg2'];
      const context: ExecutionContextHost = logic.createContext(
        args,
        instance,
        callback,
      );
      expect(context).to.be.instanceOf(ExecutionContextHost);
      expect(context.getClass()).to.be.equal(instance.constructor);
      expect(context.getHandler()).to.be.equal(callback);
      expect(context.getArgs()).to.be.equal(args);
    });
  });
  describe('transformDeffered', () => {
    describe('when next() result is plain value', () => {
      it('should return Observable', async () => {
        const val = 3;
        const next = async () => val;
        expect(await logic.transformDeffered(next).toPromise()).to.be.eql(val);
      });
    });
    describe('when next() result is Promise', () => {
      it('should return Observable', async () => {
        const val = 3;
        const next = async () => val;
        expect(await logic.transformDeffered(next).toPromise()).to.be.eql(val);
      });
    });
    describe('when next() result is Observable', () => {
      it('should return Observable', async () => {
        const val = 3;
        const next = async () => of(val);
        expect(
          await (await (logic.transformDeffered(next) as any)).toPromise(),
        ).to.be.eql(val);
      });
    });
  });
});
