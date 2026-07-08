import { NestInterceptor, Type } from '@nestjs/common';
import {
  CallHandler,
  ContextType,
  Controller,
} from '@nestjs/common/interfaces';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { AsyncResource } from 'async_hooks';
import { Observable, defer, from } from 'rxjs';
import { mergeAll } from 'rxjs/operators';
import { ExecutionContextHost } from '../helpers/execution-context-host';

export class InterceptorsConsumer {
  public async intercept<TContext extends string = ContextType>(
    interceptors: NestInterceptor[],
    args: unknown[],
    instance: Controller,
    callback: (...args: unknown[]) => unknown,
    next: () => Promise<unknown>,
    type?: TContext,
  ): Promise<unknown> {
    if (isEmpty(interceptors)) {
      return next();
    }
    const context = this.createContext(args, instance, callback);
    context.setType<TContext>(type!);

    const nextFn = async (i = 0) => {
      if (i >= interceptors.length) {
        return defer(AsyncResource.bind(() => this.transformDeferred(next)));
      }
      const handler: CallHandler = {
        handle: () =>
          defer(AsyncResource.bind(() => nextFn(i + 1))).pipe(mergeAll()),
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
    // defer(AsyncResource.bind(...)), so the async context (e.g. AsyncLocalStorage)
    // is correctly inherited. Deferring next() into the subscriber function would
    // lose that context because the subscriber is called outside the bound scope.
    const nextPromise = next();
    return new Observable(subscriber => {
      let innerSub: { unsubscribe(): void } | undefined;

      nextPromise
        .then(res => {
          if (subscriber.closed) {
            // The outer subscription was torn down (e.g. an SSE client disconnect)
            // before the async handler resolved. Subscribe-and-immediately-unsubscribe
            // so the producer Observable's teardown/cleanup logic still runs.
            if (res instanceof Observable) {
              const sub = res.subscribe({ error: () => {} });
              sub.unsubscribe();
            }
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
