import { expect } from 'chai';
import { asapScheduler } from 'rxjs';
import { take } from 'rxjs/operators';

import { scheduledAsyncIterable } from '../../addons/rxjs/scheduledAsyncIterable';

describe('scheduleAsyncIterable()', () => {
  it('', complete => {
    const iterator = {
      [Symbol.asyncIterator]: () => ({
        i: 1,
        next() {
          while (this.i < 5) {
            return Promise.resolve({ value: this.i++, done: false });
          }
          return Promise.resolve({ value: undefined, done: true });
        },
      }),
    };

    let count = 1;

    scheduledAsyncIterable<number>(iterator, asapScheduler).subscribe({
      next(v) {
        expect(v).to.equal(count++);
      },
      complete,
    });
  });
});
