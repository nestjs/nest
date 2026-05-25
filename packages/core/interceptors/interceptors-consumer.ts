import type { NestInterceptor, Type } from '@nestjs/common';
import { AsyncResource } from 'async_hooks';
import { Observable, defer, from as fromPromise } from 'rxjs';
import { mergeAll, switchMap } from 'rxjs/operators';
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
    if (isEmptyArray(interceptors)) {
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
    return fromPromise(next()).pipe(
      switchMap(res => {
        const isDeferred = res instanceof Promise || res instanceof Observable;
        return isDeferred ? res : Promise.resolve(res);
      }),
    );
  }
}
