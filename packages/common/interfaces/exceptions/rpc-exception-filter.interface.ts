import { Observable } from 'rxjs/Observable';

export interface RpcExceptionFilter<T = any, R = any> {
  catch(exception: T): Observable<R>;
}
