import type { NestInterceptor, Type } from '@nestjs/common';
import { AsyncResource } from 'async_hooks';
import {
  Observable,
  type ObservableInput,
  type Subscriber,
  from,
  isObservable,
  of,
} from 'rxjs';
import { mergeAll } from 'rxjs/operators';
import { getClassRef } from '../helpers/class-ref-registry.js';
import { destroyUnsentBody } from '../helpers/destroy-unsent-body.js';
import { ExecutionContextHost } from '../helpers/execution-context-host.js';
import type { CallHandler, ContextType } from '@nestjs/common';
import { type Controller, isEmptyArray } from '@nestjs/common/internal';

export class InterceptorsConsumer {
  public async intercept<TContext extends string = ContextType>(
    interceptors: NestInterceptor[],
    args: unknown[],
    instance: Controller,
    callback: (...args: unknown[]) => unknown,
    next: () => Promise<unknown>,
    type?: TContext,
  ): Promise<unknown> {
    if (!interceptors || isEmptyArray(interceptors)) {
      return next();
    }
    const context = this.createContext(args, instance, callback);
    context.setType<TContext>(type!);

    // Subscribes one level of the chain: the next interceptor, or the route
    // handler behind the last one. An Observable the interceptor returns is
    // subscribed directly, anything else (a Promise of one) is flattened.
    const subscribeLevel = (i: number, subscriber: Subscriber<unknown>) => {
      let result: unknown;
      try {
        result =
          i >= interceptors.length
            ? this.transformDeferred(next)
            : interceptors[i].intercept(context, createHandler(i + 1));
        return isObservable(result)
          ? result.subscribe(subscriber)
          : from(Promise.resolve(result) as Promise<ObservableInput<unknown>>)
              .pipe(mergeAll())
              .subscribe(subscriber);
      } catch (err) {
        subscriber.error(err);
        return undefined;
      }
    };
    const createHandler = (i: number): CallHandler => ({
      handle: () => {
        const scope = createAsyncScope();
        return new Observable(subscriber =>
          scope(() => subscribeLevel(i, subscriber)),
        );
      },
    });
    return new Observable(subscriber => subscribeLevel(0, subscriber));
  }

  public createContext(
    args: unknown[],
    instance: Controller,
    callback: (...args: unknown[]) => unknown,
  ): ExecutionContextHost {
    return new ExecutionContextHost(
      args,
      getClassRef(instance) as Type<unknown>,
      callback,
    );
  }

  public transformDeferred(next: () => Promise<any>): Observable<any> {
    // Call next() eagerly here — this method is invoked inside the scope of the
    // last handle() call, so the async context (e.g. AsyncLocalStorage) is
    // correctly inherited. Deferring next() into the subscriber function would
    // lose that context because the subscriber is called outside that scope.
    const nextPromise = next();
    return new Observable(subscriber => {
      let innerSub: { unsubscribe(): void } | undefined;

      nextPromise
        .then(res => {
          if (subscriber.closed) {
            // The outer subscription was torn down (e.g. an SSE client disconnect)
            // before the async handler resolved. Do not subscribe the producer
            // Observable after the consumer has already gone away — subscribing
            // only to unsubscribe in the same tick would start producer side
            // effects just to immediately abort them. A StreamableFile or another
            // stream, though, already holds what it reads from (e.g. an open file).
            destroyUnsentBody(res);
            return;
          }
          // "isObservable()" also recognises Observables created by another copy
          // of rxjs, which are not instances of the "Observable" class imported here
          const isDeferred = res instanceof Promise || isObservable(res);
          innerSub = (isDeferred ? from(res) : of(res)).subscribe(subscriber);
        })
        .catch(err => {
          if (!subscriber.closed) {
            subscriber.error(err);
          }
        });

      return () => {
        innerSub?.unsubscribe();
      };
    });
  }
}

/**
 * Like `AsyncResource.bind(fn)`, but the returned function takes the `fn` to
 * run: the resource is created here, so `fn` runs in this call's async context
 * (AsyncLocalStorage stores included) each time it is invoked.
 * `AsyncResource.bind()` also defines a deprecated `asyncResource` accessor on
 * every function it returns, which makes it about 25 times slower, and this
 * runs once per interceptor on every request.
 */
function createAsyncScope(): <T>(fn: () => T) => T {
  const resource = new AsyncResource('interceptor-scope');
  return fn => resource.runInAsyncScope(fn);
}
