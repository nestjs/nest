import { Observable, SchedulerLike } from 'rxjs';

import { isPromise } from '../../utils/isPromise';
import { schedulePromise } from './scheduledPromise';
import { scheduledAsyncIterable } from './scheduledAsyncIterable';

export const asyncPromise = <T>(
  input: Promise<T> | AsyncIterable<T>,
  scheduler: SchedulerLike,
  unsubscriber?: ((...args: any[]) => any) | void,
): Observable<T> => {
  if (isPromise(input)) {
    return schedulePromise<T>(input as Promise<T>, scheduler, unsubscriber);
  }

  return scheduledAsyncIterable<T>(
    input as AsyncIterable<T>,
    scheduler,
    unsubscriber,
  );
};
