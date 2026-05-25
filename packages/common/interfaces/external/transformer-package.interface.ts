import { Type } from '../type.interface.js';
import { ClassTransformOptions } from './class-transform-options.interface.js';

export interface TransformerPackage {
  plainToInstance<T>(
    cls: Type<T>,
    plain: unknown,
    options?: ClassTransformOptions,
  ): T | T[];
  classToPlain(
    object: unknown,
    options?: ClassTransformOptions,
  ): Record<string, any> | Record<string, any>[];
}
