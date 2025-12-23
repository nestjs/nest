import { Injectable } from '../decorators/core';
import { Optional } from '../decorators';
import { HttpStatus } from '../enums/http-status.enum';
import {
  ArgumentMetadata,
  PipeTransform,
} from '../interfaces/features/pipe-transform.interface';
import { StandardSchemaV1 } from '../interfaces/external/standard-schema.interface';
import {
  ErrorHttpStatusCode,
  HttpErrorByCode,
} from '../utils/http-error-by-code.util';
import { isNil } from '../utils/shared.utils';

/**
 * Validation issue with path information.
 * @publicApi
 */
export interface StandardSchemaIssue {
  /**
   * The error message.
   */
  message: string;
  /**
   * The path to the property that failed validation.
   */
  path?: string;
}

/**
 * Options for StandardSchemaValidationPipe.
 * @publicApi
 */
export interface StandardSchemaValidationPipeOptions {
  /**
   * HTTP status code to use when validation fails.
   * @default HttpStatus.BAD_REQUEST (400)
   */
  errorHttpStatusCode?: ErrorHttpStatusCode;

  /**
   * Custom exception factory to create the exception thrown when validation fails.
   * Receives an array of validation issues and should return an exception.
   */
  exceptionFactory?: (issues: StandardSchemaIssue[]) => any;

  /**
   * If true, error messages will not be included in the response.
   * @default false
   */
  disableErrorMessages?: boolean;

  /**
   * If true, validation will also be performed on arguments with custom decorators.
   * @default false
   */
  validateCustomDecorators?: boolean;

  /**
   * The property name on the DTO class that contains the Standard Schema.
   * @default 'schema'
   */
  schemaProperty?: string;
}

/**
 * Interface for a class that has a static Standard Schema property.
 */
interface SchemaHost {
  [key: string]: StandardSchemaV1 | unknown;
}

/**
 * A validation pipe that uses Standard Schema-compliant validators
 * (Zod, Valibot, ArkType, etc.) for request validation.
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 *
 * class CreateUserDto {
 *   static schema = z.object({
 *     email: z.string().email(),
 *     name: z.string().min(2),
 *   });
 *
 *   email: string;
 *   name: string;
 * }
 *
 * // Apply globally
 * app.useGlobalPipes(new StandardSchemaValidationPipe());
 *
 * // Or on a specific route
 * @Post()
 * @UsePipes(new StandardSchemaValidationPipe())
 * create(@Body() dto: CreateUserDto) {
 *   return this.service.create(dto);
 * }
 * ```
 *
 * @see https://standardschema.dev/
 * @see [Validation](https://docs.nestjs.com/techniques/validation)
 *
 * @publicApi
 */
@Injectable()
export class StandardSchemaValidationPipe implements PipeTransform<any> {
  protected readonly errorHttpStatusCode: ErrorHttpStatusCode;
  protected readonly exceptionFactory: (issues: StandardSchemaIssue[]) => any;
  protected readonly disableErrorMessages: boolean;
  protected readonly validateCustomDecorators: boolean;
  protected readonly schemaProperty: string;

  constructor(@Optional() options?: StandardSchemaValidationPipeOptions) {
    options = options || {};

    this.errorHttpStatusCode =
      options.errorHttpStatusCode || HttpStatus.BAD_REQUEST;
    this.disableErrorMessages = options.disableErrorMessages || false;
    this.validateCustomDecorators = options.validateCustomDecorators || false;
    this.schemaProperty = options.schemaProperty || 'schema';
    this.exceptionFactory =
      options.exceptionFactory || this.createExceptionFactory();
  }

  /**
   * Transforms and validates the input value using the Standard Schema.
   * @param value The value to validate
   * @param metadata Argument metadata containing type information
   * @returns The validated value (potentially transformed by the schema)
   */
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    const { metatype, type } = metadata;

    if (!metatype || !this.shouldValidate(metadata)) {
      return value;
    }

    const schema = this.getSchema(metatype);
    if (!schema) {
      return value;
    }

    const result = await this.validate(schema, value);

    if (result.issues) {
      const issues = this.mapIssuesToValidationErrors(result.issues);
      throw this.exceptionFactory(issues);
    }

    return result.value;
  }

  /**
   * Determines if the value should be validated.
   */
  protected shouldValidate(metadata: ArgumentMetadata): boolean {
    const { metatype, type } = metadata;

    if (type === 'custom' && !this.validateCustomDecorators) {
      return false;
    }

    // Skip primitive types
    const types = [String, Boolean, Number, Array, Object, Buffer, Date];
    return !types.some(t => metatype === t) && !isNil(metatype);
  }

  /**
   * Gets the Standard Schema from the metatype class.
   */
  protected getSchema(metatype: SchemaHost): StandardSchemaV1 | undefined {
    const schema = metatype[this.schemaProperty];
    if (this.isStandardSchema(schema)) {
      return schema;
    }
    return undefined;
  }

  /**
   * Type guard to check if a value is a Standard Schema.
   */
  protected isStandardSchema(value: unknown): value is StandardSchemaV1 {
    return (
      value !== null &&
      typeof value === 'object' &&
      '~standard' in value &&
      typeof (value as StandardSchemaV1)['~standard'].validate === 'function'
    );
  }

  /**
   * Validates the value using the Standard Schema.
   */
  protected async validate(
    schema: StandardSchemaV1,
    value: unknown,
  ): Promise<StandardSchemaV1.Result<unknown>> {
    const result = schema['~standard'].validate(value);
    // Handle both sync and async validation
    if (result instanceof Promise) {
      return result;
    }
    return result;
  }

  /**
   * Maps Standard Schema issues to validation error format.
   */
  protected mapIssuesToValidationErrors(
    issues: ReadonlyArray<StandardSchemaV1.Issue>,
  ): StandardSchemaIssue[] {
    return issues.map(issue => ({
      message: issue.message,
      path: issue.path
        ? issue.path
            .map(segment =>
              typeof segment === 'object' && 'key' in segment
                ? String(segment.key)
                : String(segment),
            )
            .join('.')
        : undefined,
    }));
  }

  /**
   * Creates the default exception factory.
   */
  protected createExceptionFactory(): (issues: StandardSchemaIssue[]) => any {
    return (issues: StandardSchemaIssue[]) => {
      if (this.disableErrorMessages) {
        return new HttpErrorByCode[this.errorHttpStatusCode]();
      }
      const messages = issues.map(issue =>
        issue.path ? `${issue.path}: ${issue.message}` : issue.message,
      );
      return new HttpErrorByCode[this.errorHttpStatusCode](messages);
    };
  }
}
