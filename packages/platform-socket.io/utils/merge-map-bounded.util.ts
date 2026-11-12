import {
  defer,
  Observable,
  type ObservableInput,
  type OperatorFunction,
} from 'rxjs';

interface WaitingValue<T> {
  value: T;
  next?: WaitingValue<T>;
}

/**
 * `mergeMap(project, concurrent)` for the messages of a client, which decides
 * how many arrive before the first one has been handled. `mergeMap()` removes
 * each completed inner subscription from an array of all the active ones, and
 * `shift()`s each waiting value off an array of all the waiting ones, so a
 * burst costs time quadratic in its size. Here at most `concurrent` inner
 * subscriptions are active, and the values that wait for their turn are kept
 * in a linked list. `onBacklog` is told when values start and stop waiting,
 * e.g. to stop reading from the client in the meantime. Where reading cannot
 * be stopped, `maxWaiting` caps the list: a value that arrives while that many
 * wait is dropped, and `onOverflow` is called, e.g. to disconnect the client.
 */
export function mergeMapBounded<T, R>(
  project: (value: T) => ObservableInput<R>,
  concurrent: number,
  onBacklog?: (isBacklogged: boolean) => void,
  maxWaiting = Infinity,
  onOverflow?: () => void,
): OperatorFunction<T, R> {
  return source =>
    new Observable<R>(subscriber => {
      let head: WaitingValue<T> | undefined;
      let tail: WaitingValue<T> | undefined;
      let waiting = 0;
      let active = 0;
      let isDraining = false;
      let isSourceComplete = false;
      let isBacklogged = false;

      // A loop, not recursion: an inner observable may complete synchronously,
      // and how many values wait is up to the client.
      const drain = () => {
        if (isDraining) {
          return;
        }
        isDraining = true;
        while (head && active < concurrent && !subscriber.closed) {
          const { value } = head;
          head = head.next;
          waiting--;
          if (!head) {
            // Otherwise the last value would be kept until the next one
            tail = undefined;
          }
          active++;
          subscriber.add(
            defer(() => project(value)).subscribe({
              next: result => subscriber.next(result),
              error: err => subscriber.error(err),
              complete: () => {
                active--;
                drain();
              },
            }),
          );
        }
        isDraining = false;

        if (onBacklog && isBacklogged !== !!head) {
          isBacklogged = !!head;
          onBacklog(isBacklogged);
        }
        if (isSourceComplete && !head && active === 0) {
          subscriber.complete();
        }
      };

      subscriber.add(
        source.subscribe({
          next: value => {
            // Negated, so that a limit that is not a number lets nothing wait
            // instead of everything
            if (!(active < concurrent) && !(waiting < maxWaiting)) {
              onOverflow?.();
              return;
            }
            const node: WaitingValue<T> = { value };
            tail = head ? (tail!.next = node) : (head = node);
            waiting++;
            drain();
          },
          error: err => subscriber.error(err),
          complete: () => {
            isSourceComplete = true;
            drain();
          },
        }),
      );
    });
}
