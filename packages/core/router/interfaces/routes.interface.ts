import { Type } from '@nestjs/common';

/**
 * Defines the Routes Tree
 * - `path` - a string describe the Module path which will be applied
 * to all it's controllers and childs
 * - `module` - the parent Module.
 * - `children` - an array of child Modules.
 */
export interface Route {
  path: string;
  module?: Type<any>;
  children?: Routes | Type<any>[];
}

/**
 * Defines the Routes Tree
 * - `path` - a string describe the Module path which will be applied
 * to all it's controllers and childs
 * - `module` - the parent Module.
 * - `children` - an array of child Modules.
 *
 * @publicapi
 */
export type Routes = Route[];
