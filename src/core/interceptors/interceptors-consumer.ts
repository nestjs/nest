import iterate from 'iterare';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { isUndefined, isFunction, isNil, isEmpty } from '@nestjs/common/utils/shared.utils';
import { Controller } from '@nestjs/common/interfaces';
import { HttpStatus, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/observable/defer';
import 'rxjs/add/operator/take';

export class InterceptorsConsumer {
    public async intercept(
      interceptors: NestInterceptor[],
      dataOrRequest: any,
      instance: Controller,
      callback: (...args) => any,
      next: () => Promise<any>,
    ): Promise<any> {
        if (!interceptors || isEmpty(interceptors)) {
            return await next();
        }
        const context = this.createContext(instance, callback);
        const start$ = Observable.defer(() => this.transformDeffered(next));
        const result$ = await interceptors.reduce(
          async (stream$, interceptor) => await interceptor.intercept(dataOrRequest, context, await stream$),
          Promise.resolve(start$),
        );
        return await result$.toPromise();
    }

    public createContext(instance: Controller, callback: (...args) => any): ExecutionContext {
        return {
            parent: instance.constructor,
            handler: callback,
        };
    }

    public transformDeffered(next: () => any): Promise<any> | Observable<any> {
      const res = next();
      const isDeffered = res instanceof Promise || res instanceof Observable;
      return isDeffered ? res : Promise.resolve(res);
    }
}