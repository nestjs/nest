import { ClassTransformOptions } from '../interfaces/external/class-transform-options.interface';
import { Type } from '../interfaces';

/**
 * @publicApi
 */
export interface ClassSerializerContextOptions extends ClassTransformOptions {
  type?: Type<any>;
}
