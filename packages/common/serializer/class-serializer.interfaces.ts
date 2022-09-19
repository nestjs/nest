import { ClassTransformOptions } from '../interfaces/external/class-transform-options.interface';
import { Type } from '../interfaces';

export interface ClassSerializerContextOptions extends ClassTransformOptions {
  type?: Type<any>;
}
