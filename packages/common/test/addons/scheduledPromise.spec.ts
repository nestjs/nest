import { expect } from 'chai';
import { asapScheduler } from 'rxjs';

import { schedulePromise } from '../../addons/rxjs/scheduledPromise';

describe('schedulePromise()', () => {
  it('completes successfully', complete => {
    const promised = Promise.resolve(1);

    schedulePromise(promised, asapScheduler).subscribe({
      next(v) {
        expect(v).to.equal(1);
      },
      complete,
    });
  });

  it('errors', () => {
    const promised = Promise.reject(new Error());

    schedulePromise(promised, asapScheduler).subscribe({
      error(e) {
        expect(e).to.be.instanceOf(Error);
      },
    });
  });
});
