import { Type } from '../type.interface.js';
import { Paramtype } from './paramtype.interface.js';
import type { StandardSchemaV1 } from '@standard-schema/spec';

export type Transform<T = any> = (value: T, metadata: ArgumentMetadata) => any;

/**
 * Interface describing a pipe implementation's `transform()` method metadata argument.
 *
 * @see [Pipes](https://docs.nestjs.com/pipes)
 *
 * @publicApi
 */
export interface ArgumentMetadata<Metatype = any> {
  /**
   * Indicates whether argument is a body, query, param, or custom parameter
   */
  readonly type: Paramtype;
  /**
   * Underlying base type (e.g., `String`) of the parameter, based on the type
   * definition in the route handler.
   */
  readonly metatype?: Type<Metatype> | undefined;
  /**
   * String passed as an argument to the decorator.
   * Example: `@Body('userId')` would yield `userId`
   */
  readonly data?: string | undefined;
  /**
   * A standard schema object.
   * Can be used to validate the parameter's value against the schema, or to generate API.
   */
  readonly schema?: StandardSchemaV1;
}

/**
 * Interface describing implementation of a pipe.
 *
 * @see [Pipes](https://docs.nestjs.com/pipes)
 *
 * @publicApi
 */
export interface PipeTransform<T = any, R = any> {
  /**
   * Method to implement a custom pipe.  Called with two parameters
   *
   * @param value argument before it is received by route handler method
   * @param metadata contains metadata about the value
   */
  transform(value: T, metadata: ArgumentMetadata): R;
}
