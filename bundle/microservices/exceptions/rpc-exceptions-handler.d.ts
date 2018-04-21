import { Observable } from 'rxjs/Observable';
import { RpcException } from './rpc-exception';
import { RpcExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions';
import { ArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
export declare class RpcExceptionsHandler {
    private static readonly logger;
    private filters;
    handle(exception: Error | RpcException | any, host: ArgumentsHost): Observable<any>;
    setCustomFilters(filters: RpcExceptionFilterMetadata[]): void;
    invokeCustomFilters(exception: any, host: ArgumentsHost): Observable<any> | null;
}
