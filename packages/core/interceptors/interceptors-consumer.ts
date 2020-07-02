import { NestInterceptor, Type } from '@nestjs/common';
import {
  CallHandler,
  ContextType,
  Controller,
} from '@nestjs/common/interfaces';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { defer, from as fromPromise, of, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ExecutionContextHost } from '../helpers/execution-context-host';

const isDeffered = <T>(val: Observable<T> | Promise<T> | T): val is Promise<T> | Observable<T> =>
  val instanceof Promise || val instanceof Observable;

const switchAllWithoutFlatten = () =>
  switchMap(<T>(val: Observable<T> | Promise<T> | T): Observable<T> | Promise<T> =>
    isDeffered(val) ? val : of(val));

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
    context.setType<TContext>(type);

    const start$ = defer(() => this.transformDeffered(next));
    const nextFn = (i = 0) => async () => {
      if (i >= interceptors.length) {
        return start$;
      }
      const handler: CallHandler = {
        handle: () => fromPromise(nextFn(i + 1)()).pipe(switchAllWithoutFlatten()),
      };
      return interceptors[i].intercept(context, handler);
    };
    return nextFn()();
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

  public transformDeffered(next: () => Promise<any>): Observable<any> {
    return fromPromise(next()).pipe(switchAllWithoutFlatten());
  }
}
