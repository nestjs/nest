import { expect } from 'chai';
import * as sinon from 'sinon';
import { RouterRenderInterceptorsConsumer } from '../../interceptors/router-render-interceptors-consumer';
import { InterceptorsConsumerLogic } from '../../interceptors/interceptors-consumer-logic';
import { NestRouterRenderInterceptor } from '../../../common/interfaces';

describe('RouterRenderInterceptorsConsumer', () => {
  const args = [];
  const controller = {};
  const callback = () => {};
  const renderedView = '<div>Rendered view<div>';
  let logicInterceptSpy: sinon.SinonSpy;
  const renderInterceptors: NestRouterRenderInterceptor[] = [
    {
      renderIntercept() {
        return null;
      },
    },
    {
      renderIntercept() {
        return null;
      },
    },
  ];
  let renderInterceptResult: any;

  const mockRenderInterceptorExecutionContext = {};
  let mockRenderInterceptorExecutionContextFactory: sinon.SinonSpy;

  beforeEach(async () => {
    mockRenderInterceptorExecutionContextFactory = sinon
      .stub()
      .returns(mockRenderInterceptorExecutionContext);

    const logic = new InterceptorsConsumerLogic();
    logicInterceptSpy = sinon
      .stub(logic, 'intercept')
      .returns(Promise.resolve('Observable<any>'));

    const routerRenderInterceptorsConsumer = new RouterRenderInterceptorsConsumer(
      logic,
      mockRenderInterceptorExecutionContextFactory,
    );

    routerRenderInterceptorsConsumer.prepare(
      renderInterceptors,
      args,
      controller,
      callback,
    );
    renderInterceptResult = await routerRenderInterceptorsConsumer.renderIntercept(
      renderedView,
    );
  });
  describe('renderIntercept calls InterceptorsConsumerLogic', () => {
    it('should return the result from InterceptorsConsumerLogic.intercept', () => {
      expect(renderInterceptResult).to.eql('Observable<any>');
    });

    it('should pass arguments from prepare', async () => {
      const logicInterceptArgs = logicInterceptSpy.firstCall.args;
      expect(logicInterceptArgs[2]).to.be.equal(renderInterceptors);
      expect(logicInterceptArgs[3]).to.be.equal(args);
      expect(logicInterceptArgs[4]).to.be.equal(controller);
      expect(logicInterceptArgs[5]).to.be.equal(callback);
    });

    it('should pass resolved rendered view as next return value', async () => {
      const resolvedNext = await logicInterceptSpy.firstCall.args[6]();
      expect(resolvedNext).to.be.eql(renderedView);
    });

    it('should create RenderInterceptorExecutionContext from the ExecutionContext', () => {
      const getContextFunction = logicInterceptSpy.firstCall.args[0];
      const mockExecutionContext = {};
      const renderInterceptorExecutionContext = getContextFunction(
        mockExecutionContext,
      );
      expect(
        mockRenderInterceptorExecutionContextFactory.firstCall.lastArg,
      ).to.be.equal(mockExecutionContext);
      expect(renderInterceptorExecutionContext).to.be.equal(
        mockRenderInterceptorExecutionContext,
      );
    });

    it('should call renderIntercept with context and call handler', () => {
      const interceptInterceptFunction = logicInterceptSpy.firstCall.args[1];
      const renderInterceptorExecutionContext = {};
      const callHandler = {};
      const renderInterceptor = {
        renderIntercept: sinon.stub().returns('Observable<string>'),
      };
      const interceptorInterceptResult = interceptInterceptFunction(
        renderInterceptor,
        renderInterceptorExecutionContext,
        callHandler,
      );
      expect(interceptorInterceptResult).to.be.eql('Observable<string>');
      expect(
        renderInterceptor.renderIntercept.calledOnceWithExactly(
          sinon.match.same(renderInterceptorExecutionContext),
          sinon.match.same(callHandler),
        ),
      ).to.be.true;
    });
  });
});
