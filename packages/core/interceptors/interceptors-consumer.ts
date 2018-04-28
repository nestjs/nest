import iterate from 'iterare';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  isUndefined,
  isFunction,
  isNil,
  isEmpty,
} from '@nestjs/common/utils/shared.utils';
import { Controller } from '@nestjs/common/interfaces';
import { HttpStatus, NestInterceptor } from '@nestjs/common';
import { Observable, defer, from as fromPromise } from 'rxjs';
import { take, switchMap } from 'rxjs/operators';
import { ExecutionContextHost } from '../helpers/execution-context.host';

export class InterceptorsConsumer {
  public async intercept(
    interceptors: NestInterceptor[],
    args: any[],
    instance: Controller,
    callback: (...args) => any,
    next: () => Promise<any>,
  ): Promise<any> {
    if (!interceptors || isEmpty(interceptors)) {
      return await await next();
    }
    const context = this.createContext(args, instance, callback);
    const start$ = defer(() => this.transformDeffered(next));
    const result$ = await interceptors.reduce(
      async (stream$, interceptor) =>
        await interceptor.intercept(context, await stream$),
      Promise.resolve(start$),
    );
    return await result$.toPromise();
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
