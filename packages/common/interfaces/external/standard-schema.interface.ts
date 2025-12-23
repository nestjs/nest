/**
 * Standard Schema interfaces (v1)
 * @see https://standardschema.dev/
 *
 * These types are copied from the Standard Schema specification.
 * Standard Schema is a common interface designed to be implemented by
 * JavaScript and TypeScript schema libraries (Zod, Valibot, ArkType, etc.)
 *
 * @publicApi
 */

/**
 * The Standard Schema interface.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

export declare namespace StandardSchemaV1 {
  /**
   * The Standard Schema properties.
   */
  export interface Props<Input = unknown, Output = Input> {
    /**
     * The version number of the standard.
     */
    readonly version: 1;
    /**
     * The vendor name of the schema library.
     */
    readonly vendor: string;
    /**
     * The validation function of the schema.
     */
    readonly validate: (
      value: unknown,
    ) => Result<Output> | Promise<Result<Output>>;
    /**
     * Inferred types associated with the schema.
     */
    readonly types?: Types<Input, Output> | undefined;
  }

  /**
   * The result of a schema validation.
   */
  export type Result<Output> = SuccessResult<Output> | FailureResult;

  /**
   * The successful result of a schema validation.
   */
  export interface SuccessResult<Output> {
    /**
     * The validated output value.
     */
    readonly value: Output;
    /**
     * The validation issues (undefined for success).
     */
    readonly issues?: undefined;
  }

  /**
   * The failed result of a schema validation.
   */
  export interface FailureResult {
    /**
     * The validation issues.
     */
    readonly issues: ReadonlyArray<Issue>;
  }

  /**
   * A validation issue.
   */
  export interface Issue {
    /**
     * The issue message.
     */
    readonly message: string;
    /**
     * The path to the issue in the input value.
     */
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }

  /**
   * A path segment with a key.
   */
  export interface PathSegment {
    /**
     * The key of the path segment.
     */
    readonly key: PropertyKey;
  }

  /**
   * Infers the input type of a Standard Schema.
   */
  export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['input'];

  /**
   * Infers the output type of a Standard Schema.
   */
  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['output'];
}
