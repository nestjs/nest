import { RpcExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions';
import { ArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
import { Observable } from 'rxjs';
import { BaseRpcExceptionFilter } from './base-rpc-exception-filter';
import { RpcException } from './rpc-exception';
export declare class RpcExceptionsHandler extends BaseRpcExceptionFilter {
    private filters;
    handle(exception: Error | RpcException | any, host: ArgumentsHost): Observable<any>;
    setCustomFilters(filters: RpcExceptionFilterMetadata[]): void;
    invokeCustomFilters(exception: any, host: ArgumentsHost): Observable<any> | null;
}
