import 'rxjs/add/observable/throw';

import {Catch, RpcExceptionFilter} from '@nestjs/common';
import {RpcException} from '@nestjs/microservices';
import {Observable} from 'rxjs/Observable';

@Catch(RpcException)
export class ExceptionFilter implements RpcExceptionFilter {
  catch(exception: RpcException): Observable<any> {
    return Observable.throw(exception.getError());
  }
}