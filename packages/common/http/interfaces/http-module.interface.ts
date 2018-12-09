import { AxiosRequestConfig } from 'axios';
import { ModuleMetadata, Provider, Type } from '../../interfaces';

export interface HttpModuleOptions extends AxiosRequestConfig {}

export interface HttpModuleOptionsFactory {
  createHttpOptions(): Promise<HttpModuleOptions> | HttpModuleOptions;
}

export interface HttpModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<HttpModuleOptions>;
  useClass?: Type<HttpModuleOptions>;
  useFactory?: (
    ...args: any[]
  ) => Promise<HttpModuleOptions> | HttpModuleOptions;
  inject?: any[];
  extraProviders?: Provider[];
}
