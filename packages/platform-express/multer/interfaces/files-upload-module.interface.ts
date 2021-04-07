import { Type } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';

import { MulterOptions } from './multer-options.interface';

export type MulterModuleOptions = MulterOptions;

export interface MulterOptionsFactory {
  createMulterOptions(): Promise<MulterModuleOptions> | MulterModuleOptions;
}

export interface MulterModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<MulterOptionsFactory>;
  useClass?: Type<MulterOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<MulterModuleOptions> | MulterModuleOptions;
  inject?: any[];
}
