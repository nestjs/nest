import { ArgumentsHost, RpcExceptionFilter } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class BaseRpcExceptionFilter<T = any, R = any> implements RpcExceptionFilter<T> {
    private static readonly logger;
    catch(exception: T, host: ArgumentsHost): Observable<R>;
}
