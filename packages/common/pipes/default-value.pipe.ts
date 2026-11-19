import { Injectable } from '../decorators/core/injectable.decorator.js';
import {
  ArgumentMetadata,
  PipeTransform,
} from '../interfaces/features/pipe-transform.interface.js';
import { isNil, isNumber, isPlainObject } from '../utils/shared.utils.js';

/**
 * Defines the built-in DefaultValue Pipe
 *
 * A default value that is an array or a plain object is copied on every call
 * (along with the arrays and plain objects nested in it), so that a handler
 * that mutates its argument does not change it for subsequent requests. Any
 * other object (e.g., a class instance, a `Date` or a `Map`) is returned as is.
 *
 * @see [Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)
 *
 * @publicApi
 */
@Injectable()
export class DefaultValuePipe<T = any, R = any> implements PipeTransform<
  T,
  T | R
> {
  constructor(protected readonly defaultValue: R) {}

  transform(value?: T, _metadata?: ArgumentMetadata): T | R {
    if (
      isNil(value) ||
      (isNumber(value) && isNaN(value as unknown as number))
    ) {
      return this.copyDefaultValue(this.defaultValue);
    }
    return value;
  }

  /**
   * Copies `value` if it is an array or a plain object, along with the arrays
   * and plain objects nested in it. `copies` maps the objects copied so far
   * to their copies, so that shared and circular references are preserved.
   */
  protected copyDefaultValue<V>(value: V, copies?: Map<unknown, unknown>): V {
    const isArray =
      Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype;
    if (!isArray && !isPlainObject(value)) {
      return value;
    }
    copies ??= new Map();
    if (copies.has(value)) {
      return copies.get(value) as V;
    }
    const copy = isArray
      ? new Array(value.length)
      : Object.create(Object.getPrototypeOf(value));
    copies.set(value, copy);
    for (const key of Reflect.ownKeys(value as object)) {
      if (!Object.prototype.propertyIsEnumerable.call(value, key)) {
        continue;
      }
      Object.defineProperty(copy, key, {
        value: this.copyDefaultValue(Reflect.get(value as object, key), copies),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return copy;
  }
}
