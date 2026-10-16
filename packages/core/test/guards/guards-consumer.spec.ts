import { expect } from 'chai';
import { of } from 'rxjs';
import { GuardsConsumer } from '../../guards/guards-consumer';
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
        expect(canActivate).to.be.true;
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
          expect(canActivate).to.be.false;
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
          expect(canActivate).to.be.true;
        });
      });
      describe('when a guard returns an Observable from another copy of rxjs', () => {
        it('should use the value it emits', async () => {
          // Not an instance of the "Observable" class imported here
          const source$ = of(false);
          const foreign$ = {
            lift: source$.lift.bind(source$),
            subscribe: source$.subscribe.bind(source$),
          };
          const canActivate = await consumer.tryActivate(
            [...guards, { canActivate: () => foreign$ }],
            [],
            { constructor: null },
            null!,
          );
          expect(canActivate).to.be.false;
        });
      });
      describe('when a guard returns a Promise of an Observable', () => {
        it('should use the value the Observable emits', async () => {
          const canActivate = await consumer.tryActivate(
            [...guards, { canActivate: async () => of(false) }],
            [],
            { constructor: null },
            null!,
          );
          expect(canActivate).to.be.false;
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
          expect(canActivate).to.be.true;
          expect(storage1.getStore()).to.equal(1);
          expect(storage2.getStore()).to.equal(2);
        });
      });
    });
  });
  describe('pickResult', () => {
    describe('when result is Observable', () => {
      it('should return result', async () => {
        expect(await consumer.pickResult(of(true))).to.be.true;
      });
    });
    describe('when result is Promise', () => {
      it('should await promise', async () => {
        expect(await consumer.pickResult(Promise.resolve(true))).to.be.true;
      });
    });
  });
});
