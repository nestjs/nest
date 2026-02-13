import { MulterOptions } from './multer-options.interface.js';
import { ModuleMetadata, Type } from '@nestjs/common';

export type MulterModuleOptions = MulterOptions;

/**
 * @publicApi
 */
export interface MulterOptionsFactory {
  createMulterOptions(): Promise<MulterModuleOptions> | MulterModuleOptions;
}

/**
 * @publicApi
 */
export interface MulterModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  useExisting?: Type<MulterOptionsFactory>;
  useClass?: Type<MulterOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<MulterModuleOptions> | MulterModuleOptions;
  inject?: any[];
}
