import { of } from 'rxjs';
import { GuardsConsumer } from '../../guards/guards-consumer.js';
import { AsyncLocalStorage } from 'async_hooks';

describe('GuardsConsumer', () => {
  let consumer: GuardsConsumer;
  let guards: any[];
  beforeEach(() => {
    consumer = new GuardsConsumer();
    guards = [{ canActivate: () => true }, { canActivate: () => true }];
  });
  describe('tryActivate', () => {
    describe('when guards array is empty', () => {
      it('should return true', async () => {
        const canActivate = await consumer.tryActivate(
          [],
          [],
          { constructor: null },
          null!,
        );
        expect(canActivate).toBe(true);
      });
    });
    describe('when guards array is not empty', () => {
      describe('when at least on guard returns false', () => {
        it('should return false', async () => {
          const canActivate = await consumer.tryActivate(
            [...guards, { canActivate: () => false }],
            [],
            { constructor: null },
            null!,
          );
          expect(canActivate).toBe(false);
        });
      });
      describe('when each guard returns true', () => {
        it('should return true', async () => {
          const canActivate = await consumer.tryActivate(
            guards,
            [],
            { constructor: null },
            null!,
          );
          expect(canActivate).toBe(true);
        });
      });
      describe('when sync guards initialize AsyncLocalStorages', () => {
        it('should keep local storages accessible', async () => {
          const storage1 = new AsyncLocalStorage<number>();
          const storage2 = new AsyncLocalStorage<number>();
          const canActivate = await consumer.tryActivate(
            [
              {
                canActivate: () => {
                  storage1.enterWith(1);
                  return true;
                },
              },
              {
                canActivate: () => {
                  storage2.enterWith(2);
                  return true;
                },
              },
            ],
            [],
            { constructor: null },
            null!,
          );
          expect(canActivate).toBe(true);
          expect(storage1.getStore()).toBe(1);
          expect(storage2.getStore()).toBe(2);
        });
      });
    });
  });
  describe('pickResult', () => {
    describe('when result is Observable', () => {
      it('should return result', async () => {
        expect(await consumer.pickResult(of(true))).toBe(true);
      });
    });
    describe('when result is Promise', () => {
      it('should await promise', async () => {
        expect(await consumer.pickResult(Promise.resolve(true))).toBe(true);
      });
    });
  });
});
