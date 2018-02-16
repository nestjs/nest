import { Catch, RpcExceptionFilter } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { RpcException } from '@nestjs/microservices';
import { _throw } from 'rxjs/observable/throw';

@Catch(RpcException)
export class ExceptionFilter implements RpcExceptionFilter {
  catch(exception: RpcException): Observable<any> {
    return _throw(exception.getError());
  }
}
