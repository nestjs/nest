import { NestInterceptor } from '@nestjs/common';
import {
  CallHandler,
  ContextType,
  Controller,
} from '@nestjs/common/interfaces';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { defer, from as fromPromise, Observable } from 'rxjs';
import { mergeAll, switchMap } from 'rxjs/operators';
import { ExecutionContextHost } from '../helpers/execution-context-host';

export class InterceptorsConsumer {
  public async intercept<TContext extends string = ContextType>(
    interceptors: NestInterceptor[],
    args: any[],
    instance: Controller,
    callback: (...args: any[]) => any,
    next: () => Promise<any>,
    type?: TContext,
  ): Promise<any> {
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
        handle: () => fromPromise(nextFn(i + 1)()).pipe(mergeAll()),
      };
      return interceptors[i].intercept(context, handler);
    };
    return nextFn()();
  }

  public createContext(
    args: any[],
    instance: Controller,
    callback: (...args: any[]) => any,
  ): ExecutionContextHost {
    return new ExecutionContextHost(
      args,
      instance.constructor as any,
      callback,
    );
  }

  public transformDeffered(next: () => Promise<any>): Observable<any> {
    return fromPromise(next()).pipe(
      switchMap(res => {
        const isDeffered = res instanceof Promise || res instanceof Observable;
        return isDeffered ? res : Promise.resolve(res);
      }),
    );
  }
}
