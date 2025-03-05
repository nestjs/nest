import { expect } from 'chai';
import * as sinon from 'sinon';
import { BaseExceptionFilter } from '@nestjs/core';
import { KafkaMaxRetryExceptionFilter } from '@nestjs/microservices/exceptions/kafka-max-retry-exception-filter';

describe('KafkaMaxRetryExceptionFilter', () => {
  let filter: KafkaMaxRetryExceptionFilter;
  let dummyKafkaContext: any;
  let dummyHost: any;
  let skipHandlerSpy: sinon.SinonSpy;
  let commitOffsetsSpy: sinon.SinonSpy;
  let baseCatchSpy: sinon.SinonSpy;

  // dummyResponse: mock HTTP response object
  const dummyResponse = {
    isHeadersSent: false,
    status() {
      return this;
    },
    json() {},
  };

  // dummyApplicationRef: Mocks the HTTP adapter used by BaseExceptionFilter.
  const dummyApplicationRef = {
    isHeadersSent: (response: any) => response && response.isHeadersSent,
    reply: (response: any, message: any, status: number) => {},
    end: (response: any) => {},
  };

  beforeEach(() => {
    skipHandlerSpy = sinon.spy(async () => {});
    commitOffsetsSpy = sinon.spy(async () => {});

    dummyKafkaContext = {
      getMessage: sinon.stub().returns({
        offset: '0',
        headers: { retryCount: '10' },
      }),
      getConsumer: sinon.stub().returns({
        commitOffsets: commitOffsetsSpy,
      }),
      getTopic: sinon.stub().returns('test-topic'),
      getPartition: sinon.stub().returns(0),
    };

    // dummyHost: Mocks the ArgumentsHost and HTTP context.
    dummyHost = {
      switchToRpc: () => ({
        getContext: () => dummyKafkaContext,
      }),
      switchToHttp: () => ({
        getResponse: () => dummyResponse,
      }),
      // Always returns dummyResponse regardless of the index.
      getArgByIndex: (_: number) => dummyResponse,
      getArgs: () => [dummyResponse],
      getType: () => 'http',
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('when retry count exceeds or more maxRetries', () => {
    it('should call skipHandler and commit offset, without calling BaseExceptionFilter.catch', async () => {
      // Set maxRetries to 5.
      // Since the message's retryCount is 10, the condition is met.
      filter = new KafkaMaxRetryExceptionFilter(5, skipHandlerSpy);
      baseCatchSpy = sinon.spy(BaseExceptionFilter.prototype, 'catch');

      await filter.catch(new Error('Test error'), dummyHost);

      expect(skipHandlerSpy.calledOnce).to.be.true;
      expect(commitOffsetsSpy.calledOnce).to.be.true;
      expect(baseCatchSpy.notCalled).to.be.true;
      baseCatchSpy.restore();
    });
  });

  describe('when retry count is below maxRetries', () => {
    it('should call BaseExceptionFilter.catch and not call skipHandler or commit offset', async () => {
      // Change the message's retryCount to 3 to simulate below maxRetries condition.
      dummyKafkaContext.getMessage.returns({
        offset: '0',
        headers: { retryCount: '3' },
      });

      filter = new KafkaMaxRetryExceptionFilter(5, skipHandlerSpy);
      // Assign dummyApplicationRef to mimic the HTTP adapter used by BaseExceptionFilter.
      (filter as any).applicationRef = dummyApplicationRef;
      baseCatchSpy = sinon.spy(BaseExceptionFilter.prototype, 'catch');

      await filter.catch(new Error('Test error'), dummyHost);

      expect(baseCatchSpy.calledOnce).to.be.true;
      expect(skipHandlerSpy.notCalled).to.be.true;
      expect(commitOffsetsSpy.notCalled).to.be.true;
      baseCatchSpy.restore();
    });
  });
});
