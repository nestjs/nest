import type { StandardSchemaV1 } from '@standard-schema/spec';
import { Observable, type OperatorFunction } from 'rxjs';
import { Inject, Injectable, Optional } from '../decorators/core/index.js';
import { StreamableFile } from '../file-stream/index.js';
import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '../interfaces/index.js';
import { isStreamingBody } from '../utils/is-streaming-body.util.js';
import { mapStreamingBody } from '../utils/map-streaming-body.util.js';
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

interface WaitingValue<T> {
  value: T;
  next?: WaitingValue<T>;
}

/**
 * `concatMap(project)` for a `project` that returns a promise: values are
 * projected one at a time, in order. `concatMap()` `shift()`s each waiting
 * value off an array of all the waiting ones, so a stream that emits many
 * values at once (e.g. `from()` an array) took time quadratic in their
 * number, without the event loop running in between. Here they wait in a
 * linked list.
 */
function concatMapAsync<T, R>(
  project: (value: T) => Promise<R>,
): OperatorFunction<T, R> {
  return source =>
    new Observable<R>(subscriber => {
      let head: WaitingValue<T> | undefined;
      let tail: WaitingValue<T> | undefined;
      let isProjecting = false;
      let isSourceComplete = false;

      const projectNext = () => {
        if (subscriber.closed) {
          return;
        }
        if (!head) {
          isProjecting = false;
          if (isSourceComplete) {
            subscriber.complete();
          }
          return;
        }
        const { value } = head;
        head = head.next;
        isProjecting = true;
        project(value).then(
          result => {
            subscriber.next(result);
            projectNext();
          },
          err => subscriber.error(err),
        );
      };

      subscriber.add(
        source.subscribe({
          next: value => {
            const waiting: WaitingValue<T> = { value };
            tail = head ? (tail!.next = waiting) : (head = waiting);
            if (!isProjecting) {
              projectNext();
            }
          },
          error: err => subscriber.error(err),
          complete: () => {
            isSourceComplete = true;
            if (!isProjecting) {
              projectNext();
            }
          },
        }),
      );
    });
}

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

    // The router sends each object a stream yields as a line of JSON, so these
    // are serialized as the stream yields them. Other transports leave what a
    // stream yields to whatever consumes it (e.g. a GraphQL subscription).
    const isHttp = context.getType?.() === 'http';
    return next
      .handle()
      .pipe(
        concatMapAsync(
          async (res: PlainLiteralObject | Array<PlainLiteralObject>) =>
            isHttp && schema && isStreamingBody(res)
              ? mapStreamingBody(res, chunk =>
                  this.serialize(
                    chunk as PlainLiteralObject,
                    schema,
                    validateOptions,
                  ),
                )
              : this.serialize(res, schema, validateOptions),
        ),
      );
  }

  /**
   * Serializes responses that are non-null objects nor streams.
   */
  serialize(
    response: PlainLiteralObject | Array<PlainLiteralObject>,
    schema: StandardSchemaV1 | undefined,
    validateOptions?: StandardSchemaV1.Options,
  ):
    | PlainLiteralObject
    | Array<PlainLiteralObject>
    | Promise<PlainLiteralObject | Array<PlainLiteralObject>> {
    if (
      !schema ||
      !isObject(response) ||
      response instanceof StreamableFile ||
      isStreamingBody(response)
    ) {
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
    const [handlerOptions, classOptions]: (
      StandardSchemaSerializerContextOptions | undefined
    )[] = this.reflector.getAll(CLASS_SERIALIZER_OPTIONS, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!handlerOptions || !classOptions) {
      return handlerOptions ?? classOptions;
    }
    // Key by key, so that a handler that only sets "validateOptions" (or the
    // options of another serializer) doesn't drop the schema of its class
    return {
      schema: handlerOptions.schema ?? classOptions.schema,
      validateOptions:
        handlerOptions.validateOptions ?? classOptions.validateOptions,
    };
  }
}
