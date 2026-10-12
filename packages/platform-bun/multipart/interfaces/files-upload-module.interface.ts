import type {
  InjectionToken,
  ModuleMetadata,
  OptionalFactoryDependency,
  Type,
} from '@nestjs/common';
import type { MultipartOptions } from './multipart-options.interface.js';

export type MultipartModuleOptions = MultipartOptions;

/**
 * @publicApi
 */
export interface MultipartOptionsFactory {
  createMultipartOptions():
    Promise<MultipartModuleOptions> | MultipartModuleOptions;
}

/**
 * @publicApi
 */
export interface MultipartModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  useExisting?: Type<MultipartOptionsFactory>;
  useClass?: Type<MultipartOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<MultipartModuleOptions> | MultipartModuleOptions;
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
}
