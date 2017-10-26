import { HttpException } from '@nestjs/core';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/catch';
import { Observable } from 'rxjs/Observable';
import { Interceptor, NestInterceptor, ExecutionContext, HttpStatus } from '';

@Interceptor()
export class ExceptionInterceptor implements NestInterceptor {
  intercept(dataOrRequest, context: ExecutionContext, stream$: Observable<any>): Observable<any> {
    return stream$.catch((err) => Observable.throw(
      new HttpException('Exception interceptor message', HttpStatus.BAD_GATEWAY),
    ));
  }
}
