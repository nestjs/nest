import { setTimeout } from 'timers/promises';
import { Barrier } from '../../../core/helpers/barrier.js';

describe('Barrier', () => {
  const targetCount = 3;
  let barrier: Barrier;
  let barrierResolveSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    barrier = new Barrier(targetCount);
    barrierResolveSpy = vi.spyOn(<any>barrier, 'resolve');
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

      expect(barrierResolveSpy).toHaveBeenCalled();
    });

    it('should not resolve the barrier when target count is not reached', async () => {
      for (let i = 0; i < targetCount - 1; i++) {
        barrier.signal();
      }

      expect(barrierResolveSpy).not.toHaveBeenCalled();
      expect((<any>barrier).currentCount).toBe(targetCount - 1);
    });
  });

  describe('wait', () => {
    it('should resolve when target count is reached', async () => {
      const waitPromise = barrier.wait();

      for (let i = 0; i < targetCount; i++) {
        barrier.signal();
      }

      await expect(waitPromise).resolves.toBeUndefined();
    });

    it('should not resolve when target count is not reached', async () => {
      for (let i = 0; i < targetCount - 1; i++) {
        barrier.signal();
      }

      const result = await Promise.race([
        barrier.wait().then(() => 'resolved'),
        setTimeout(50).then(() => 'pending'),
      ]);
      expect(result).toBe('pending');
    });
  });

  describe('signalAndWait', () => {
    it('should resolve when target count is reached', async () => {
      const promise = Promise.all(
        Array.from({ length: targetCount }, () => barrier.signalAndWait()),
      );

      // wait for the promise to be resolved
      await promise;

      await expect(promise).resolves.toBeDefined();
      expect(barrierResolveSpy).toHaveBeenCalled();
    });

    it('should not resolve when target count is not reached', async () => {
      const promises = Array.from({ length: targetCount - 1 }, () =>
        barrier.signalAndWait(),
      );

      const result = await Promise.race([
        Promise.all(promises).then(() => 'resolved'),
        setTimeout(50).then(() => 'pending'),
      ]);

      expect(result).toBe('pending');
      expect(barrierResolveSpy).not.toHaveBeenCalled();
    });
  });
});
