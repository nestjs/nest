import { expect } from 'chai';
import * as sinon from 'sinon';
import { renderInterceptorExecutionContextFactory } from '../../interceptors/render-interceptor-executioncontext';
import { ExecutionContextHost } from '../../helpers/execution-context-host';

describe('RenderInterceptorExecutionContext', () => {
  describe('factory', () => {
    const mockRequest = {};
    const mockResponse = {};
    class Controller {}
    const handler = () => {};

    const executionContextHost = new ExecutionContextHost(null, null, null);
    const httpArgumentsHost = {
      getNext: sinon.stub(),
      getRequest: sinon.stub().returns(mockRequest),
      getResponse: sinon.stub().returns(mockResponse),
    };
    sinon.stub(executionContextHost, 'switchToHttp').returns(httpArgumentsHost);
    sinon.stub(executionContextHost, 'getClass').returns(Controller);
    sinon.stub(executionContextHost, 'getHandler').returns(handler);

    const renderInterceptorExecutionContext = renderInterceptorExecutionContextFactory(
      executionContextHost,
    );

    describe('returns RenderInterceptorExecutionContext', () => {
      describe('RenderExecutionContext adapts ExecutionContext', () => {
        it('should getRequest from http', () => {
          expect(renderInterceptorExecutionContext.getRequest()).to.be.equal(
            mockRequest,
          );
        });

        it('should getResponse from http', () => {
          expect(renderInterceptorExecutionContext.getResponse()).to.be.equal(
            mockResponse,
          );
        });

        it('should getClass from the ExecutionContext', () => {
          expect(renderInterceptorExecutionContext.getClass()).to.be.equal(
            Controller,
          );
        });

        it('should getHandler from the ExecutionContext', () => {
          expect(renderInterceptorExecutionContext.getHandler()).to.be.equal(
            handler,
          );
        });
      });
    });
  });
});
