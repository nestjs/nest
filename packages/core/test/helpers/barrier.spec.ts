import { expect } from 'chai';
import { Barrier } from '../../../core/helpers/barrier';
import * as sinon from 'sinon';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { setTimeout } from 'timers/promises';
chai.use(chaiAsPromised);

describe('Barrier', () => {
  const targetCount = 3;
  let barrier: Barrier;
  let barrierResolveSpy: sinon.SinonSpy;

  beforeEach(() => {
    barrier = new Barrier(targetCount);
    barrierResolveSpy = sinon.spy(<any>barrier, 'resolve');
  });

  afterEach(() => {
    // resolve any promises that may still be waiting in the background
    (<any>barrier).resolve();
  });

  describe('signal', () => {
    it('should resolve the barrier when target count is reached', async () => {
      for (let i = 0; i < targetCount; i++) {
        barrier.signal();
      }

      expect(barrierResolveSpy.called).to.be.true;
    });

    it('should not resolve the barrier when target count is not reached', async () => {
      for (let i = 0; i < targetCount - 1; i++) {
        barrier.signal();
      }

      expect(barrierResolveSpy.called).to.be.false;
      expect((<any>barrier).currentCount).to.be.equal(targetCount - 1);
    });
  });

  describe('wait', () => {
    it('should resolve when target count is reached', async () => {
      const waitPromise = barrier.wait();

      for (let i = 0; i < targetCount; i++) {
        barrier.signal();
      }

      expect(waitPromise).to.be.fulfilled;
    });

    it('should not resolve when target count is not reached', async () => {
      const waitPromise = barrier.wait();

      for (let i = 0; i < targetCount - 1; i++) {
        barrier.signal();
      }

      expect(waitPromise).not.to.be.fulfilled;
    });
  });

  describe('signalAndWait', () => {
    it('should resolve when target count is reached', async () => {
      const promise = Promise.all(
        Array.from({ length: targetCount }, () => barrier.signalAndWait()),
      );

      // wait for the promise to be resolved
      await promise;

      expect(promise).to.be.fulfilled;
      expect(barrierResolveSpy.called).to.be.true;
    });

    it('should not resolve when target count is not reached', async () => {
      const promise = Promise.all(
        Array.from({ length: targetCount - 1 }, () => barrier.signalAndWait()),
      );

      /*
       * Give the promise some time to work. We cannot await the promise because the test case would
       * get stuck.
       */
      await setTimeout(5);

      expect(promise).not.to.be.fulfilled;
      expect(barrierResolveSpy.called).to.be.false;
    });
  });
});
