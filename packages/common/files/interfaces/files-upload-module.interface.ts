import { ModuleMetadata, Type } from '@nestjs/common/interfaces';
import { MulterOptions } from '../../interfaces/external/multer-options.interface';

export interface MulterModuleOptions extends MulterOptions {}

export interface MulterOptionsFactory {
  createMulterOptions(): Promise<MulterModuleOptions> | MulterModuleOptions;
}

export interface MulterModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<MulterOptionsFactory>;
  useClass?: Type<MulterOptionsFactory>;
  useFactory?: (
    ...args: any[],
  ) => Promise<MulterModuleOptions> | MulterModuleOptions;
  inject?: any[];
}
