import { EMPTY, from, lastValueFrom, of, Subject, toArray } from 'rxjs';
import { mergeMapBounded } from '../../utils/merge-map-bounded.util.js';

describe('mergeMapBounded', () => {
  it('should merge the values of the inner observables', async () => {
    const result = await lastValueFrom(
      from([1, 2, 3]).pipe(
        mergeMapBounded(value => of(value, value * 10), 2),
        toArray(),
      ),
    );

    expect(result).toEqual([1, 10, 2, 20, 3, 30]);
  });

  it('should keep at most "concurrent" inner observables active and start the waiting ones in arrival order', () => {
    const source$ = new Subject<number>();
    const inners: Subject<string>[] = [];
    const started: number[] = [];
    const received: string[] = [];

    source$
      .pipe(
        mergeMapBounded(value => {
          started.push(value);
          return (inners[value] = new Subject<string>());
        }, 2),
      )
      .subscribe(value => received.push(value));

    [0, 1, 2, 3].forEach(value => source$.next(value));
    expect(started).toEqual([0, 1]);

    inners[1].next('b');
    inners[1].complete();
    expect(started).toEqual([0, 1, 2]);

    inners[0].complete();
    expect(started).toEqual([0, 1, 2, 3]);

    inners[3].next('d');
    expect(received).toEqual(['b', 'd']);
  });

  it('should not grow the stack when the waiting values complete synchronously', () => {
    const source$ = new Subject<number>();
    const blocker$ = new Subject<never>();
    const onError = vi.fn();
    let projected = 0;

    source$
      .pipe(
        mergeMapBounded(value => {
          projected++;
          return value === 0 ? blocker$ : EMPTY;
        }, 1),
      )
      .subscribe({ error: onError });

    const size = 100_000;
    for (let value = 0; value <= size; value++) {
      source$.next(value);
    }
    expect(projected).toBe(1);

    blocker$.complete();
    expect(projected).toBe(size + 1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('should complete once the source and every inner observable have completed', () => {
    const source$ = new Subject<number>();
    const inners: Subject<number>[] = [];
    const onComplete = vi.fn();

    source$
      .pipe(mergeMapBounded(value => (inners[value] = new Subject()), 1))
      .subscribe({ complete: onComplete });

    source$.next(0);
    source$.next(1);
    source$.complete();
    inners[0].complete();
    expect(onComplete).not.toHaveBeenCalled();

    inners[1].complete();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should error when "project" throws', () => {
    const error = new Error('project blew up');
    const onError = vi.fn();

    of(1)
      .pipe(
        mergeMapBounded(() => {
          throw error;
        }, 1),
      )
      .subscribe({ error: onError });

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should unsubscribe from the active inner observables and drop the waiting values on unsubscribe', () => {
    const source$ = new Subject<number>();
    const inner$ = new Subject<number>();
    const project = vi.fn(() => inner$);

    const subscription = source$.pipe(mergeMapBounded(project, 1)).subscribe();
    source$.next(0);
    source$.next(1);
    subscription.unsubscribe();

    expect(source$.observed).toBe(false);
    expect(inner$.observed).toBe(false);
    inner$.complete();
    expect(project).toHaveBeenCalledTimes(1);
  });

  it('should report when values start and stop waiting for their turn', () => {
    const source$ = new Subject<number>();
    const inners: Subject<never>[] = [];
    const onBacklog = vi.fn();

    source$
      .pipe(
        mergeMapBounded(
          value => (inners[value] = new Subject<never>()),
          1,
          onBacklog,
        ),
      )
      .subscribe();

    source$.next(0);
    expect(onBacklog).not.toHaveBeenCalled();

    source$.next(1);
    source$.next(2);
    expect(onBacklog.mock.calls).toEqual([[true]]);

    inners[0].complete();
    expect(onBacklog.mock.calls).toEqual([[true]]);

    inners[1].complete();
    expect(onBacklog.mock.calls).toEqual([[true], [false]]);
  });

  it('should not hold values back without a limit', () => {
    const source$ = new Subject<number>();
    const project = vi.fn(() => new Subject<never>());

    source$.pipe(mergeMapBounded(project, Infinity)).subscribe();
    for (let value = 0; value < 3; value++) {
      source$.next(value);
    }

    expect(project).toHaveBeenCalledTimes(3);
  });
});
