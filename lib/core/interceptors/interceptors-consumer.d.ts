import { Controller } from '@nestjs/common/interfaces';
import { ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/observable/defer';
import 'rxjs/add/operator/take';
export declare class InterceptorsConsumer {
    intercept(interceptors: NestInterceptor[], dataOrRequest: any, instance: Controller, callback: (...args) => any, next: () => Promise<any>): Promise<any>;
    createContext(instance: Controller, callback: (...args) => any): ExecutionContext;
    transformDeffered(next: () => any): Promise<any> | Observable<any>;
}
