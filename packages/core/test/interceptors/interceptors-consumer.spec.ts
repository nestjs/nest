import { expect } from 'chai';
import * as sinon from 'sinon';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer';
import { InterceptorsConsumerLogic } from '../../interceptors/interceptors-consumer-logic';
import { DidRender, AnyNestInterceptor } from '../../../common/interfaces';

describe('InterceptorsConsumer', () => {
  describe('intercept uses the InterceptorsConsumerLogic', () => {
    let logicInterceptSpy: sinon.SinonSpy;
    let logic: InterceptorsConsumerLogic;

    const args = [];
    const controller = {};
    const handler = () => {};
    const next = () => Promise.resolve();

    let interceptors: AnyNestInterceptor[];

    let interceptorsConsumer: InterceptorsConsumer;
    let didRender: DidRender | undefined;
    beforeEach(() => {
      didRender = undefined;
      interceptors = [];
      logic = new InterceptorsConsumerLogic();
      logicInterceptSpy = sinon
        .stub(logic, 'intercept')
        .returns(Promise.resolve('Observable<any>'));
    });

    function interceptorsConsumerIntercept(filterInterceptors?: false) {
      interceptorsConsumer = new InterceptorsConsumer(logic);
      if (filterInterceptors === false) {
        interceptorsConsumer.filterInterceptors = false;
      }
      if (didRender) {
        interceptorsConsumer.didRender = didRender;
      }
      return interceptorsConsumer.intercept(
        interceptors,
        args,
        controller,
        handler,
        next,
        'rpc',
      );
    }

    it('should return the result from the logic', async () => {
      const result = await interceptorsConsumerIntercept();
      expect(result).to.be.equal('Observable<any>');
    });

    describe('filtering interceptors', () => {
      it('should filter interceptors to those with intercept method and pass to the logic when filter true', async () => {
        interceptors = [
          {
            intercept: () => null,
          },
          {
            renderIntercept: () => null,
          },
        ];
        await interceptorsConsumerIntercept();
        expect(logicInterceptSpy.firstCall.args[2]).to.be.eql([
          interceptors[0],
        ]);
      });
    });

    it('should pass through all intercept arguments other than interceptors to logic', async () => {
      await interceptorsConsumerIntercept();
      const logicInterceptArguments = logicInterceptSpy.firstCall.args;
      expect(logicInterceptArguments[3]).to.be.equal(args);
      expect(logicInterceptArguments[4]).to.be.equal(controller);
      expect(logicInterceptArguments[5]).to.be.equal(handler);
      expect(logicInterceptArguments[6]).to.be.equal(next);
      expect(logicInterceptArguments[7]).to.be.eql('rpc');
    });

    it('should return the execution context from getContext', async () => {
      await interceptorsConsumerIntercept();
      const getContextFunction = logicInterceptSpy.args[0][0];
      const executionContext = {};
      expect(getContextFunction(executionContext)).to.be.equal(
        executionContext,
      );
    });

    it('should call intercept on the interceptor with context, call handler and didRender', async () => {
      didRender = { rendered: true };
      await interceptorsConsumerIntercept();
      const interceptorInterceptFunction = logicInterceptSpy.args[0][1];
      const executionContext = {};
      const callHandler = {};
      const interceptor = {
        intercept: sinon.stub().returns('Observable<any>'),
      };
      const interceptorInterceptResult = interceptorInterceptFunction(
        interceptor,
        executionContext,
        callHandler,
      );
      expect(
        interceptor.intercept.calledOnceWithExactly(
          sinon.match.same(executionContext),
          sinon.match.same(callHandler),
          sinon.match.same(didRender),
        ),
      ).to.be.true;
      expect(interceptorInterceptResult).to.be.eql('Observable<any>');
    });
  });
});
