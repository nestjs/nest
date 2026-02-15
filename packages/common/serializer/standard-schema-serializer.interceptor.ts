import type { StandardSchemaV1 } from '@standard-schema/spec';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Inject, Injectable, Optional } from '../decorators/core/index.js';
import { StreamableFile } from '../file-stream/index.js';
import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '../interfaces/index.js';
import { isObject } from '../utils/shared.utils.js';
import { CLASS_SERIALIZER_OPTIONS } from './class-serializer.constants.js';
import { StandardSchemaSerializerContextOptions } from './standard-schema-serializer.interfaces.js';

interface PlainLiteralObject {
  [key: string]: any;
}

// NOTE (external)
// We need to deduplicate them here due to the circular dependency
// between core and common packages
const REFLECTOR = 'Reflector';

/**
 * @publicApi
 */
export interface StandardSchemaSerializerInterceptorOptions {
  /**
   * A default standard schema to use for serialization when no schema
   * is provided via `@SerializeOptions()`.
   */
  schema?: StandardSchemaV1;
  /**
   * Default options forwarded to the schema's `~standard.validate()` call.
   * Can be overridden per-handler via `@SerializeOptions({ validateOptions })`.
   */
  validateOptions?: StandardSchemaV1.Options;
}

/**
 * An interceptor that serializes outgoing responses using a Standard Schema.
 *
 * The schema can be provided either:
 * - As a default option in the interceptor constructor
 * - Per-handler or per-class via `@SerializeOptions({ schema })` decorator
 *
 * When a schema is present, the interceptor validates/transforms the response
 * through the schema's `~standard.validate()` method. If validation fails,
 * the issues are thrown as an error.
 *
 * @see [Standard Schema](https://github.com/standard-schema/standard-schema)
 *
 * @publicApi
 */
@Injectable()
export class StandardSchemaSerializerInterceptor implements NestInterceptor {
  constructor(
    @Inject(REFLECTOR) protected readonly reflector: any,
    @Optional()
    protected readonly defaultOptions: StandardSchemaSerializerInterceptorOptions = {},
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const contextOptions = this.getContextOptions(context);
    const schema = contextOptions?.schema ?? this.defaultOptions.schema;
    const validateOptions =
      contextOptions?.validateOptions ?? this.defaultOptions.validateOptions;

    return next
      .handle()
      .pipe(
        map((res: PlainLiteralObject | Array<PlainLiteralObject>) =>
          this.serialize(res, schema, validateOptions),
        ),
      );
  }

  /**
   * Serializes responses that are non-null objects nor streamable files.
   */
  serialize(
    response: PlainLiteralObject | Array<PlainLiteralObject>,
    schema: StandardSchemaV1 | undefined,
    validateOptions?: StandardSchemaV1.Options,
  ):
    | PlainLiteralObject
    | Array<PlainLiteralObject>
    | Promise<PlainLiteralObject | Array<PlainLiteralObject>> {
    if (!schema || !isObject(response) || response instanceof StreamableFile) {
      return response;
    }

    return Array.isArray(response)
      ? Promise.all(
          response.map(item =>
            this.transformToPlain(item, schema, validateOptions),
          ),
        )
      : this.transformToPlain(response, schema, validateOptions);
  }

  async transformToPlain(
    plainOrClass: any,
    schema: StandardSchemaV1,
    validateOptions?: StandardSchemaV1.Options,
  ): Promise<PlainLiteralObject> {
    if (!plainOrClass) {
      return plainOrClass;
    }

    const result = await schema['~standard'].validate(
      plainOrClass,
      validateOptions,
    );

    if (result.issues) {
      throw new Error(
        `Serialization failed: ${result.issues.map(i => i.message).join(', ')}`,
      );
    }
    return result.value as PlainLiteralObject;
  }

  protected getContextOptions(
    context: ExecutionContext,
  ): StandardSchemaSerializerContextOptions | undefined {
    return this.reflector.getAllAndOverride(CLASS_SERIALIZER_OPTIONS, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}
