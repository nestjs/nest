import { Catch, RpcExceptionFilter } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { RpcException } from '@nestjs/microservices';
import 'rxjs/add/observable/throw';

@Catch(RpcException)
export class ExceptionFilter implements RpcExceptionFilter {
  catch(exception: RpcException): Observable<any> {
    return Observable.throw(exception.getError());
  }
}
