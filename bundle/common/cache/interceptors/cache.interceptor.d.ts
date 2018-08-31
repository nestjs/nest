import { Observable } from 'rxjs';
import { ExecutionContext, HttpServer, NestInterceptor } from '../../interfaces';
export declare class CacheInterceptor implements NestInterceptor {
    private readonly httpServer;
    private readonly cacheManager;
    private readonly reflector;
    private readonly isHttpApp;
    constructor(httpServer: HttpServer, cacheManager: any, reflector: any);
    intercept(context: ExecutionContext, call$: Observable<any>): Promise<Observable<any>>;
    getCacheKey(context: ExecutionContext): string | undefined;
}
