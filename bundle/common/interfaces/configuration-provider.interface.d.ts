import { NestInterceptor } from './features/nest-interceptor.interface';
import { CanActivate } from './features/can-activate.interface';
export interface ConfigurationProvider {
    getGlobalInterceptors(): NestInterceptor[];
    getGlobalGuards(): CanActivate[];
}
