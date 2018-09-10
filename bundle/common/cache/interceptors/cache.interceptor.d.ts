import { Observable } from 'rxjs';
import { ExecutionContext, HttpServer, NestInterceptor } from '../../interfaces';
export declare class CacheInterceptor implements NestInterceptor {
    protected readonly httpServer: HttpServer;
    protected readonly cacheManager: any;
    protected readonly reflector: any;
    protected readonly isHttpApp: boolean;
    constructor(httpServer: HttpServer, cacheManager: any, reflector: any);
    intercept(context: ExecutionContext, call$: Observable<any>): Promise<Observable<any>>;
    trackBy(context: ExecutionContext): string | undefined;
}
