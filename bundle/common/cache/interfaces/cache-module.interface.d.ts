import { ModuleMetadata, Type } from '../../interfaces';
import { CacheManagerOptions } from './cache-manager.interface';
export interface CacheModuleOptions extends CacheManagerOptions {
    [key: string]: any;
}
export interface CacheOptionsFactory {
    createCacheOptions(): Promise<CacheModuleOptions> | CacheModuleOptions;
}
export interface CacheModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useExisting?: Type<CacheOptionsFactory>;
    useClass?: Type<CacheOptionsFactory>;
    useFactory?: (...args: any[]) => Promise<CacheModuleOptions> | CacheModuleOptions;
    inject?: any[];
}
