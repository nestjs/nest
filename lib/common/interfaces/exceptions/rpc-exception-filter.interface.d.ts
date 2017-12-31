import { Observable } from 'rxjs/Observable';
export interface RpcExceptionFilter {
    catch(exception: any): Observable<any>;
}
