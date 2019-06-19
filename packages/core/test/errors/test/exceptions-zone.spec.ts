import { expect } from 'chai';
import * as sinon from 'sinon';
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
      ExceptionsZone.run(callback as any, rethrow);
      expect(callback.called).to.be.true;
    });
    describe('when callback throws exception', () => {
      const exceptionHandler = {
        handle: () => {},
      };
      let handleSpy: sinon.SinonSpy;
      before(() => {
        (ExceptionsZone as any).exceptionHandler = exceptionHandler;
        handleSpy = sinon.spy(exceptionHandler, 'handle');
      });
      it('should call "handle" method of exceptionHandler and rethrows', () => {
        const throwsCallback = () => {
          throw new Error('');
        };
        expect(() => ExceptionsZone.run(throwsCallback, rethrow)).to.throws();
        expect(handleSpy.called).to.be.true;
      });
    });
  });
  describe('asyncRun', () => {
    let callback: sinon.SinonSpy;
    beforeEach(() => {
      callback = sinon.spy();
    });
    it('should call callback', async () => {
      await ExceptionsZone.asyncRun(callback as any, rethrow);
      expect(callback.called).to.be.true;
    });
    describe('when callback throws exception', () => {
      const exceptionHandler = {
        handle: () => {},
      };
      let handleSpy: sinon.SinonSpy;
      before(() => {
        (ExceptionsZone as any).exceptionHandler = exceptionHandler;
        handleSpy = sinon.spy(exceptionHandler, 'handle');
      });
      it('should call "handle" method of exceptionHandler and rethrows error', async () => {
        const throwsCallback = () => {
          throw new Error('');
        };
        expect(ExceptionsZone.asyncRun(throwsCallback, rethrow)).to.eventually
          .be.rejected;
      });
    });
  });
});
