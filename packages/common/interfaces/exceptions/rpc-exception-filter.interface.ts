import { Observable } from 'rxjs/Observable';
import { ArgumentsHost } from './../features/arguments-host.interface';

export interface RpcExceptionFilter<T = any, R = any> {
  catch(exception: T, host: ArgumentsHost): Observable<R>;
}
