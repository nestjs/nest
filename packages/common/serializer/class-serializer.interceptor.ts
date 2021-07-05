import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Inject, Injectable, Optional } from '../decorators/core';
import { CallHandler, ExecutionContext, NestInterceptor } from '../interfaces';
import { ClassTransformOptions } from '../interfaces/external/class-transform-options.interface';
import { loadPackage } from '../utils/load-package.util';
import { isObject } from '../utils/shared.utils';
import { CLASS_SERIALIZER_OPTIONS } from './class-serializer.constants';

let classTransformer: any = {};

export interface PlainLiteralObject {
  [key: string]: any;
}

// NOTE (external)
// We need to deduplicate them here due to the circular dependency
// between core and common packages
const REFLECTOR = 'Reflector';

@Injectable()
export class ClassSerializerInterceptor implements NestInterceptor {
  constructor(
    @Inject(REFLECTOR) protected readonly reflector: any,
    @Optional() protected readonly defaultOptions: ClassTransformOptions = {},
  ) {
    classTransformer = loadPackage(
      'class-transformer',
      'ClassSerializerInterceptor',
      () => require('class-transformer'),
    );
    require('class-transformer');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const contextOptions = this.getContextOptions(context);
    const options = {
      ...this.defaultOptions,
      ...contextOptions,
    };
    return next
      .handle()
      .pipe(
        map((res: PlainLiteralObject | Array<PlainLiteralObject>) =>
          this.serialize(res, options),
        ),
      );
  }

  serialize(
    response: PlainLiteralObject | Array<PlainLiteralObject>,
    options: ClassTransformOptions,
  ): PlainLiteralObject | PlainLiteralObject[] {
    const isArray = Array.isArray(response);
    if (!isObject(response) && !isArray) {
      return response;
    }
    return isArray
      ? (response as PlainLiteralObject[]).map(item =>
          this.transformToPlain(item, options),
        )
      : this.transformToPlain(response, options);
  }

  transformToPlain(
    plainOrClass: any,
    options: ClassTransformOptions,
  ): PlainLiteralObject {
    return plainOrClass
      ? classTransformer.classToPlain(plainOrClass, options)
      : plainOrClass;
  }

  protected getContextOptions(
    context: ExecutionContext,
  ): ClassTransformOptions | undefined {
    return (
      this.reflectSerializeMetadata(context.getHandler()) ||
      this.reflectSerializeMetadata(context.getClass())
    );
  }

  private reflectSerializeMetadata(
    obj: object | Function,
  ): ClassTransformOptions | undefined {
    return this.reflector.get(CLASS_SERIALIZER_OPTIONS, obj);
  }
}
