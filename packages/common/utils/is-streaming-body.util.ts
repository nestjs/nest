import { isFunction, isObject } from './shared.utils.js';

/**
 * Whether the router streams this value instead of serializing it: a web
 * `Response`, or an async iterable that is not also a thenable. `@nestjs/core`
 * has its own copy, as it may run against an older `@nestjs/common`.
 */
export function isStreamingBody(value: unknown): boolean {
  return (
    isObject(value) &&
    ((isFunction(value[Symbol.asyncIterator]) && !isFunction(value['then'])) ||
      Object.prototype.toString.call(value) === '[object Response]')
  );
}
