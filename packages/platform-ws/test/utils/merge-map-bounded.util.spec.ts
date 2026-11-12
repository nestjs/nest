import { expect } from 'chai';
import { EMPTY, from, lastValueFrom, of, Subject, toArray } from 'rxjs';
import * as sinon from 'sinon';
import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';
import { mergeMapBounded } from '../../utils/merge-map-bounded.util';

describe('mergeMapBounded', () => {
  it('should merge the values of the inner observables', async () => {
    const result = await lastValueFrom(
      from([1, 2, 3]).pipe(
        mergeMapBounded(value => of(value, value * 10), 2),
        toArray(),
      ),
    );

    expect(result).to.deep.equal([1, 10, 2, 20, 3, 30]);
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
    expect(started).to.deep.equal([0, 1]);

    inners[1].next('b');
    inners[1].complete();
    expect(started).to.deep.equal([0, 1, 2]);

    inners[0].complete();
    expect(started).to.deep.equal([0, 1, 2, 3]);

    inners[3].next('d');
    expect(received).to.deep.equal(['b', 'd']);
  });

  it('should not grow the stack when the waiting values complete synchronously', () => {
    const source$ = new Subject<number>();
    const blocker$ = new Subject<never>();
    const onError = sinon.spy();
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
    expect(projected).to.equal(1);

    blocker$.complete();
    expect(projected).to.equal(size + 1);
    expect(onError.called).to.be.false;
  });

  it('should complete once the source and every inner observable have completed', () => {
    const source$ = new Subject<number>();
    const inners: Subject<number>[] = [];
    const onComplete = sinon.spy();

    source$
      .pipe(mergeMapBounded(value => (inners[value] = new Subject()), 1))
      .subscribe({ complete: onComplete });

    source$.next(0);
    source$.next(1);
    source$.complete();
    inners[0].complete();
    expect(onComplete.called).to.be.false;

    inners[1].complete();
    expect(onComplete.calledOnce).to.be.true;
  });

  it('should error when "project" throws', () => {
    const error = new Error('project blew up');
    const onError = sinon.spy();

    of(1)
      .pipe(
        mergeMapBounded(() => {
          throw error;
        }, 1),
      )
      .subscribe({ error: onError });

    expect(onError.calledOnceWithExactly(error)).to.be.true;
  });

  it('should unsubscribe from the active inner observables and drop the waiting values on unsubscribe', () => {
    const source$ = new Subject<number>();
    const inner$ = new Subject<number>();
    const project = sinon.spy(() => inner$);

    const subscription = source$.pipe(mergeMapBounded(project, 1)).subscribe();
    source$.next(0);
    source$.next(1);
    subscription.unsubscribe();

    expect(source$.observed).to.be.false;
    expect(inner$.observed).to.be.false;
    inner$.complete();
    expect(project.calledOnce).to.be.true;
  });

  it('should not hold on to a value once it has been handled', async () => {
    setFlagsFromString('--expose-gc');
    const collectGarbage: () => void = runInNewContext('gc');
    const source$ = new Subject<object>();
    const subscription = source$
      .pipe(mergeMapBounded(() => EMPTY, 1))
      .subscribe();

    const handled = new WeakRef({});
    source$.next(handled.deref()!);
    // A WeakRef keeps its target alive until the current job has ended
    await new Promise(resolve => setTimeout(resolve));
    collectGarbage();

    expect(handled.deref()).to.be.undefined;
    subscription.unsubscribe();
  });

  it('should report when values start and stop waiting for their turn', () => {
    const source$ = new Subject<number>();
    const inners: Subject<never>[] = [];
    const onBacklog = sinon.spy();

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
    expect(onBacklog.called).to.be.false;

    source$.next(1);
    source$.next(2);
    expect(onBacklog.args).to.deep.equal([[true]]);

    inners[0].complete();
    expect(onBacklog.args).to.deep.equal([[true]]);

    inners[1].complete();
    expect(onBacklog.args).to.deep.equal([[true], [false]]);
  });

  it('should drop a value and report it once "maxWaiting" values wait', () => {
    const source$ = new Subject<number>();
    const inners: Subject<never>[] = [];
    const started: number[] = [];
    const onOverflow = sinon.spy();

    source$
      .pipe(
        mergeMapBounded(
          value => {
            started.push(value);
            return (inners[value] = new Subject<never>());
          },
          1,
          undefined,
          2,
          onOverflow,
        ),
      )
      .subscribe();

    [0, 1, 2].forEach(value => source$.next(value));
    expect(onOverflow.called).to.be.false;

    source$.next(3);
    expect(onOverflow.calledOnce).to.be.true;

    // a value that has started no longer waits
    inners[0].complete();
    source$.next(4);
    expect(onOverflow.calledOnce).to.be.true;

    inners[1].complete();
    inners[2].complete();
    expect(started).to.deep.equal([0, 1, 2, 4]);
  });

  it('should let no value wait when "maxWaiting" is not a number', () => {
    const source$ = new Subject<number>();
    const project = sinon.spy(() => new Subject<never>());
    const onOverflow = sinon.spy();

    source$
      .pipe(mergeMapBounded(project, 1, undefined, NaN, onOverflow))
      .subscribe();
    source$.next(0);
    source$.next(1);

    expect(project.calledOnce).to.be.true;
    expect(onOverflow.calledOnce).to.be.true;
  });

  it('should not hold values back without a limit', () => {
    const source$ = new Subject<number>();
    const project = sinon.spy(() => new Subject<never>());

    source$.pipe(mergeMapBounded(project, Infinity)).subscribe();
    for (let value = 0; value < 3; value++) {
      source$.next(value);
    }

    expect(project.callCount).to.equal(3);
  });
});
