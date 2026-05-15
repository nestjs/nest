import { ClassTransformOptions } from '../interfaces/external/class-transform-options.interface.js';
import { Type } from '../interfaces/index.js';

/**
 * @publicApi
 */
export interface ClassSerializerContextOptions extends ClassTransformOptions {
  type?: Type<any>;
}
