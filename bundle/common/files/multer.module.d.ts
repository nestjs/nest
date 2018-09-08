import { DynamicModule } from '@nestjs/common';
import { MulterModuleAsyncOptions, MulterModuleOptions } from './interfaces/files-upload-module.interface';
export declare class MulterModule {
    static register(options?: MulterModuleOptions): DynamicModule;
    static registerAsync(options: MulterModuleAsyncOptions): DynamicModule;
    private static createAsyncProviders(options);
    private static createAsyncOptionsProvider(options);
}
