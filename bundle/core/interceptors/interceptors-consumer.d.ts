import { NestInterceptor } from '@nestjs/common';
import { Controller } from '@nestjs/common/interfaces';
import { Observable } from 'rxjs';
import { ExecutionContextHost } from '../helpers/execution-context.host';
export declare class InterceptorsConsumer {
    intercept(interceptors: NestInterceptor[], args: any[], instance: Controller, callback: (...args) => any, next: () => Promise<any>): Promise<any>;
    createContext(args: any[], instance: Controller, callback: (...args) => any): ExecutionContextHost;
    transformDeffered(next: () => Promise<any>): Observable<any>;
}
