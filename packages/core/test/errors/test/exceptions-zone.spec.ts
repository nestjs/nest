import { expect } from 'chai';
import * as sinon from 'sinon';
import { Logger } from '@nestjs/common';
import { ExceptionsZone } from '../../../errors/exceptions-zone';

describe('ExceptionsZone', () => {
  const rethrow = err => {
    throw err;
  };

  describe('run', () => {
    let callback: sinon.SinonSpy;
    beforeEach(() => {
      callback = sinon.spy();
    });
    it('should call callback', () => {
      ExceptionsZone.run(callback as any, rethrow, false);
      expect(callback.called).to.be.true;
    });
    describe('when callback throws exception', () => {
      const exceptionHandler = {
        handle: () => {},
      };
      let handleSpy: sinon.SinonSpy;
      let LoggerFlushSpy: sinon.SinonSpy;
      before(() => {
        (ExceptionsZone as any).exceptionHandler = exceptionHandler;
        handleSpy = sinon.spy(exceptionHandler, 'handle');
        LoggerFlushSpy = sinon.spy(Logger, 'flush');
      });
      after(() => {
        LoggerFlushSpy.restore();
      });
      describe('when callback throws exception and autoFlushLogs is false', () => {
        it('should call "handle" method of exceptionHandler and rethrows and not flush logs', () => {
          const throwsCallback = () => {
            throw new Error('');
          };
          expect(() =>
            ExceptionsZone.run(throwsCallback, rethrow, false),
          ).to.throws();

          expect(handleSpy.called).to.be.true;

          expect(LoggerFlushSpy.called).to.be.false;
        });
      });

      describe('when callback throws exception and autoFlushLogs is true', () => {
        it('should call "handle" method of exceptionHandler and rethrows and flush logs', () => {
          const throwsCallback = () => {
            throw new Error('');
          };
          expect(() =>
            ExceptionsZone.run(throwsCallback, rethrow, true),
          ).to.throws();

          expect(handleSpy.called).to.be.true;

          expect(LoggerFlushSpy.called).to.be.true;
        });
      });
    });
  });

  describe('asyncRun', () => {
    let callback: sinon.SinonSpy;
    beforeEach(() => {
      callback = sinon.spy();
    });
    it('should call callback', async () => {
      await ExceptionsZone.asyncRun(callback as any, rethrow, false);
      expect(callback.called).to.be.true;
    });
    describe('when callback throws exception', () => {
      const exceptionHandler = {
        handle: () => {},
      };
      let handleSpy: sinon.SinonSpy;
      let LoggerFlushSpy: sinon.SinonSpy;
      before(() => {
        (ExceptionsZone as any).exceptionHandler = exceptionHandler;
        handleSpy = sinon.spy(exceptionHandler, 'handle');
        LoggerFlushSpy = sinon.spy(Logger, 'flush');
      });
      after(() => {
        LoggerFlushSpy.restore();
      });
      describe('when callback throws exception and autoFlushLogs is false', () => {
        it('should call "handle" method of exceptionHandler and rethrows error and not flush logs', async () => {
          const throwsCallback = () => {
            throw new Error('');
          };
          expect(ExceptionsZone.asyncRun(throwsCallback, rethrow, false)).to
            .eventually.be.rejected;

          expect(handleSpy.called).to.be.true;

          expect(LoggerFlushSpy.called).to.be.false;
        });
      });
      describe('when callback throws exception and autoFlushLogs is true', () => {
        it('should call "handle" method of exceptionHandler and rethrows error and flush logs', async () => {
          const throwsCallback = () => {
            throw new Error('');
          };
          expect(ExceptionsZone.asyncRun(throwsCallback, rethrow, true)).to
            .eventually.be.rejected;

          expect(handleSpy.called).to.be.true;

          expect(LoggerFlushSpy.called).to.be.true;
        });
      });
    });
  });
});
