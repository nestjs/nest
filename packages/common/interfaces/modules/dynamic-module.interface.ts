import { ModuleMetadata } from './module-metadata.interface';
import { Type } from '../type.interface';

/**
 * @publicApi
 *
 * @description
 *
 * Interface defining a Dynamic Module.
 *
 * @see [Dynamic Modules](https://docs.nestjs.com/modules#dynamic-modules)
 */
export interface DynamicModule extends ModuleMetadata {
  /**
   * A module
   */
  module: Type<any>;
}
