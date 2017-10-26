import { RpcException } from '@nestjs/microservices';
import 'rxjs/add/observable/throw';
import { Observable } from 'rxjs/Observable';
import { Catch, RpcExceptionFilter } from '';

@Catch(RpcException)
export class ExceptionFilter implements RpcExceptionFilter {
  catch(exception: RpcException): Observable<any> {
    return Observable.throw(exception.getError());
  }
}
