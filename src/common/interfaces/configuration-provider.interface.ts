import {CanActivate} from './can-activate.interface';
import {NestInterceptor} from './nest-interceptor.interface';

export interface ConfigurationProvider {
  getGlobalInterceptors(): NestInterceptor[];
  getGlobalGuards(): CanActivate[];
}