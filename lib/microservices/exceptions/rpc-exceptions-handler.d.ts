import { Observable } from 'rxjs/Observable';
import { RpcException } from './rpc-exception';
import { RpcExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions';
import 'rxjs/add/observable/throw';
export declare class RpcExceptionsHandler {
    private filters;
    handle(exception: Error | RpcException | any): Observable<any>;
    setCustomFilters(filters: RpcExceptionFilterMetadata[]): void;
    invokeCustomFilters(exception: any): Observable<any> | null;
}
