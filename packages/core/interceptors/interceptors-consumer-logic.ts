import {
  CallHandler,
  ContextType,
  Controller,
  AnyNestInterceptor,
} from '@nestjs/common/interfaces';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { defer, from as fromPromise, Observable } from 'rxjs';
import { mergeAll, switchMap } from 'rxjs/operators';
import { ExecutionContextHost } from '../helpers/execution-context-host';

export class InterceptorsConsumerLogic {
  public async intercept<
    TInterceptor extends AnyNestInterceptor,
    TInterceptContext,
    TContext extends ContextType = ContextType
  >(
    getContext: (executionContext: ExecutionContextHost) => TInterceptContext,
    interceptorIntercept: (
      interceptor: TInterceptor,
      interceptorContext: TInterceptContext,
      callHandler: CallHandler,
    ) => Observable<any> | Promise<Observable<any>>,
    interceptors: TInterceptor[],
    args: any[],
    instance: Controller,
    callback: (...args: any[]) => any,
    next: () => Promise<any>,
    type?: TContext,
  ) {
    if (isEmpty(interceptors)) {
      return next();
    }
    const context = this.createContext(args, instance, callback);
    context.setType(type);
    const interceptorContext = getContext(context);

    const start$ = defer(() => this.transformDeffered(next));
    const nextFn = (i = 0) => async () => {
      if (i >= interceptors.length) {
        return start$;
      }
      const handler: CallHandler = {
        handle: () => fromPromise(nextFn(i + 1)()).pipe(mergeAll()),
      };
      return interceptorIntercept(interceptors[i], interceptorContext, handler);
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
