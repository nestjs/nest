import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Inject, Injectable, Optional } from '../decorators/core/index.js';
import { StreamableFile } from '../file-stream/index.js';
import { ClassTransformOptions } from '../interfaces/external/class-transform-options.interface.js';
import { TransformerPackage } from '../interfaces/external/transformer-package.interface.js';
import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '../interfaces/index.js';
import { loadPackage } from '../utils/load-package.util.js';
import { isStreamingBody } from '../utils/is-streaming-body.util.js';
import { mapStreamingBody } from '../utils/map-streaming-body.util.js';
import { isObject } from '../utils/shared.utils.js';
import { CLASS_SERIALIZER_OPTIONS } from './class-serializer.constants.js';
import { ClassSerializerContextOptions } from './class-serializer.interfaces.js';

let classTransformer: any = {} as any;
// The package of the interceptor created last, which may still be loading.
// "intercept()" resolves it into "classTransformer", so that an interceptor
// created while responses are serialized (e.g. a request-scoped one) doesn't
// put a promise in place of the package they use.
let pendingClassTransformer: any;

export interface PlainLiteralObject {
  [key: string]: any;
}

// NOTE (external)
// We need to deduplicate them here due to the circular dependency
// between core and common packages
const REFLECTOR = 'Reflector';

/**
 * @publicApi
 */
export interface ClassSerializerInterceptorOptions extends ClassTransformOptions {
  transformerPackage?: TransformerPackage;
}

/**
 * @publicApi
 */
@Injectable()
export class ClassSerializerInterceptor implements NestInterceptor {
  constructor(
    @Inject(REFLECTOR) protected readonly reflector: any,
    @Optional()
    protected readonly defaultOptions: ClassSerializerInterceptorOptions = {},
  ) {
    pendingClassTransformer =
      defaultOptions?.transformerPackage ??
      loadPackage(
        'class-transformer',
        'ClassSerializerInterceptor',
        () => import('class-transformer'),
      );
    if (!(pendingClassTransformer instanceof Promise)) {
      classTransformer = pendingClassTransformer;
    }
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    classTransformer = (await pendingClassTransformer) as TransformerPackage;

    const contextOptions = this.getContextOptions(context);
    const options = {
      ...this.defaultOptions,
      ...contextOptions,
    };
    // The router sends each object a stream yields as a line of JSON, so these
    // are serialized as the stream yields them. Other transports leave what a
    // stream yields to whatever consumes it (e.g. a GraphQL subscription).
    const isHttp = context.getType?.() === 'http';
    return next
      .handle()
      .pipe(
        map((res: PlainLiteralObject | Array<PlainLiteralObject>) =>
          isHttp && isStreamingBody(res)
            ? mapStreamingBody(res, chunk =>
                this.serialize(chunk as PlainLiteralObject, options),
              )
            : this.serialize(res, options),
        ),
      );
  }

  /**
   * Serializes responses that are non-null objects nor streams.
   */
  serialize(
    response: PlainLiteralObject | Array<PlainLiteralObject>,
    options: ClassSerializerContextOptions,
  ): PlainLiteralObject | Array<PlainLiteralObject> {
    if (
      !isObject(response) ||
      response instanceof StreamableFile ||
      isStreamingBody(response)
    ) {
      return response;
    }

    return Array.isArray(response)
      ? response.map(item => this.transformToPlain(item, options))
      : this.transformToPlain(response, options);
  }

  transformToPlain(
    plainOrClass: any,
    options: ClassSerializerContextOptions,
  ): PlainLiteralObject {
    if (!plainOrClass) {
      return plainOrClass;
    }
    if (!options.type) {
      return classTransformer.classToPlain(plainOrClass, options);
    }
    if (plainOrClass instanceof options.type) {
      return classTransformer.classToPlain(plainOrClass, options);
    }
    const instance = classTransformer.plainToInstance(
      options.type,
      plainOrClass,
      options,
    );
    return classTransformer.classToPlain(instance, options);
  }

  protected getContextOptions(
    context: ExecutionContext,
  ): ClassSerializerContextOptions | undefined {
    return this.reflector.getAllAndOverride(CLASS_SERIALIZER_OPTIONS, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}
