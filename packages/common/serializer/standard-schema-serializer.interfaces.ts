import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Options for the `StandardSchemaSerializerInterceptor`, passed via
 * `@SerializeOptions({ schema })`.
 *
 * @publicApi
 */
export interface StandardSchemaSerializerContextOptions {
  /**
   * A standard schema to use for serialization.
   * Used by `StandardSchemaSerializerInterceptor` to validate/transform the response.
   */
  schema?: StandardSchemaV1;
  /**
   * Optional options forwarded to the schema's `~standard.validate()` call.
   */
  validateOptions?: StandardSchemaV1.Options;
}
