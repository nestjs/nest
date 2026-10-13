import type { NestInterceptor, Type } from '@nestjs/common';
import { AsyncResource } from 'async_hooks';
import { Observable, defer, from } from 'rxjs';
import { mergeAll } from 'rxjs/operators';
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

    const nextFn = async (i = 0) => {
      if (i >= interceptors.length) {
        return defer(bindAsyncScope(() => this.transformDeferred(next)));
      }
      const handler: CallHandler = {
        handle: () =>
          defer(bindAsyncScope(() => nextFn(i + 1))).pipe(mergeAll()),
      };
      return interceptors[i].intercept(context, handler);
    };
    return defer(() => nextFn()).pipe(mergeAll());
  }

  public createContext(
    args: unknown[],
    instance: Controller,
    callback: (...args: unknown[]) => unknown,
  ): ExecutionContextHost {
    return new ExecutionContextHost(
      args,
      instance.constructor as Type<unknown>,
      callback,
    );
  }

  public transformDeferred(next: () => Promise<any>): Observable<any> {
    // Call next() eagerly here — this method is invoked inside
    // defer(bindAsyncScope(...)), so the async context (e.g. AsyncLocalStorage)
    // is correctly inherited. Deferring next() into the subscriber function would
    // lose that context because the subscriber is called outside the bound scope.
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
            // effects just to immediately abort them.
            return;
          }
          const isDeferred =
            res instanceof Promise || res instanceof Observable;
          innerSub = from(isDeferred ? res : Promise.resolve(res)).subscribe(
            subscriber,
          );
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
 * Same as `AsyncResource.bind(fn)`: the resource is created here, so `fn` runs
 * in this call's async context (AsyncLocalStorage stores included) each time it
 * is invoked. `AsyncResource.bind()` also defines a deprecated `asyncResource`
 * accessor on every function it returns, which makes it about 25 times slower,
 * and this runs once per interceptor, plus once, on every request.
 */
function bindAsyncScope<T>(fn: () => T): () => T {
  const resource = new AsyncResource(fn.name || 'bound-anonymous-fn');
  return () => resource.runInAsyncScope(fn);
}
