import { Observable, SchedulerLike } from 'rxjs';

export const schedulePromise = <T = any>(
  input: Promise<T>,
  scheduler: SchedulerLike,
  unsubscriber?: ((...args: any[]) => any) | void,
): Observable<T> =>
  new Observable<T>(subscription => {
    input
      .then((response: T) =>
        subscription.add(
          scheduler.schedule<T>(() => subscription.next(response)),
        ),
      )
      .catch(error =>
        subscription.add(scheduler.schedule(() => subscription.error(error))),
      )
      .finally(() =>
        subscription.add(scheduler.schedule(() => subscription.complete())),
      );

    return unsubscriber;
  });
