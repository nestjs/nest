import { ModuleMetadata, Type } from '@nestjs/common/interfaces';
import { H3MulterOptions } from './multer-options.interface';

export type H3MulterModuleOptions = H3MulterOptions;

/**
 * @publicApi
 */
export interface H3MulterOptionsFactory {
  createMulterOptions(): Promise<H3MulterModuleOptions> | H3MulterModuleOptions;
}

/**
 * @publicApi
 */
export interface H3MulterModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  useExisting?: Type<H3MulterOptionsFactory>;
  useClass?: Type<H3MulterOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<H3MulterModuleOptions> | H3MulterModuleOptions;
  inject?: any[];
}
