import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/throw';

import {
  ExecutionContext,
  HttpStatus,
  Interceptor,
  NestInterceptor
} from '@nestjs/common';
import {HttpException} from '@nestjs/core';
import {Observable} from 'rxjs/Observable';

@Interceptor()
export class ExceptionInterceptor implements NestInterceptor {
  intercept(dataOrRequest, context: ExecutionContext,
            stream$: Observable<any>): Observable<any> {
    return stream$.catch((err) => Observable.throw(
                             new HttpException('Exception interceptor message',
                                               HttpStatus.BAD_GATEWAY),
                             ));
  }
}