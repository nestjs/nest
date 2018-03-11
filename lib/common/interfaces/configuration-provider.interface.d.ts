import { NestInterceptor } from './nest-interceptor.interface';
import { CanActivate } from './can-activate.interface';
export interface ConfigurationProvider {
  getGlobalInterceptors(): NestInterceptor[];
  getGlobalGuards(): CanActivate[];
}
