import { DynamicModule } from '../interfaces';
import { CacheModuleAsyncOptions, CacheModuleOptions } from './interfaces/cache-module.interface';
export declare class CacheModule {
    static register(options?: CacheModuleOptions): DynamicModule;
    static registerAsync(options: CacheModuleAsyncOptions): DynamicModule;
    private static createAsyncProviders(options);
    private static createAsyncOptionsProvider(options);
}
