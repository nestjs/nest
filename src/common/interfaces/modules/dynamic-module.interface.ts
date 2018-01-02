import { ModuleMetadata } from './module-metadata.interface';

export interface DynamicModule extends ModuleMetadata {
  module: any;
}
