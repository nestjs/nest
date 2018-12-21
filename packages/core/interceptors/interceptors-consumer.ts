import { NestInterceptor } from '@nestjs/common';
import { Controller } from '@nestjs/common/interfaces';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { defer, from as fromPromise, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ExecutionContextHost } from '../helpers/execution-context.host';

export class InterceptorsConsumer {
  public async intercept(
    interceptors: NestInterceptor[],
    args: any[],
    instance: Controller,
    callback: (...args) => any,
    next: () => Promise<any>,
  ): Promise<any> {
    if (isEmpty(interceptors)) {
      return next();
    }
    const context = this.createContext(args, instance, callback);
    const start$ = defer(() => this.transformDeffered(next));
    /***
      const nextFn =  (i: number) => async () => {
      if (i <= interceptors.length) {
        return start$;
      }
      return await interceptors[i].intercept(context, nextFn(i + 1) as any);
    };
    */
    const result$ = await interceptors.reduce(
      async (stream$, interceptor) => interceptor.intercept(context, await stream$),
      Promise.resolve(start$),
    );
    return result$;
    // return result$.toPromise(); # Promise breaking Observable stream
  }

  public createContext(
    args: any[],
    instance: Controller,
    callback: (...args) => any,
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
