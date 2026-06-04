import { expect } from 'chai';
import * as sinon from 'sinon';
import { ConsoleLogger } from '@nestjs/common';
import { TestingLogger } from '../services/testing-logger.service';

describe('TestingLogger', () => {
  let logger: TestingLogger;

  beforeEach(() => {
    logger = new TestingLogger();
  });

  describe('log', () => {
    it('should not write to stdout', () => {
      const spy = sinon.spy(process.stdout, 'write');
      logger.log('test message');
      expect(spy.called).to.be.false;
      spy.restore();
    });
  });

  describe('warn', () => {
    it('should not write to stdout', () => {
      const spy = sinon.spy(process.stdout, 'write');
      logger.warn('test warning');
      expect(spy.called).to.be.false;
      spy.restore();
    });
  });

  describe('debug', () => {
    it('should not write to stdout', () => {
      const spy = sinon.spy(process.stdout, 'write');
      logger.debug('test debug');
      expect(spy.called).to.be.false;
      spy.restore();
    });
  });

  describe('verbose', () => {
    it('should not write to stdout', () => {
      const spy = sinon.spy(process.stdout, 'write');
      logger.verbose('test verbose');
      expect(spy.called).to.be.false;
      spy.restore();
    });
  });

  describe('error', () => {
    it('should delegate to ConsoleLogger.error', () => {
      const errorStub = sinon.stub(ConsoleLogger.prototype, 'error');
      const message = 'test error';
      const trace = 'stack trace';

      logger.error(message, trace);

      expect(errorStub.calledOnce).to.be.true;
      expect(errorStub.firstCall.args[0]).to.equal(message);
      expect(errorStub.firstCall.args[1]).to.equal(trace);

      errorStub.restore();
    });
  });
});
