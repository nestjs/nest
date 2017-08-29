import iterate from 'iterare';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { isUndefined, isFunction, isNil, isEmpty } from '@nestjs/common/utils/shared.utils';
import { Controller } from '@nestjs/common/interfaces';
import { HttpStatus, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { HttpException } from '../index';
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
        const start$ = Observable.defer(next);
        const result$ = interceptors.reduce(
          (stream$, interceptor) => interceptor.intercept(dataOrRequest, context, stream$),
          start$,
        );
        return await result$.toPromise();
    }

    public createContext(instance: Controller, callback: (...args) => any): ExecutionContext {
        return {
            parent: instance.constructor,
            handler: callback,
        };
    }
}