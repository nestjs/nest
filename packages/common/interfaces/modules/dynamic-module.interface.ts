import { ModuleMetadata } from './module-metadata.interface';
import { Type } from '../type.interface';

/**
 * Interface defining a Dynamic Module.
 *
 * @see [Dynamic Modules](https://docs.nestjs.com/modules#dynamic-modules)
 *
 * @publicApi
 */
export interface DynamicModule extends ModuleMetadata {
  /**
   * A module
   */
  module: Type<any>;
}
