import { INTERCEPTORS_METADATA } from '../../constants';

/**
 * Binds interceptors to the particular context.
 * When the `@UseInterceptors()` is used on the controller level:
 * - Interceptor will be register to each handler (every method)
 *
 * When the `@UseInterceptors()` is used on the handle level:
 * - Interceptor will be registered only to specified method
 *
 * @param  {} ...interceptors (types)
 */
export function UseInterceptors(...interceptors) {
  return (target: object, key?, descriptor?) => {
    if (descriptor) {
      Reflect.defineMetadata(
        INTERCEPTORS_METADATA,
        interceptors,
        descriptor.value,
      );
      return descriptor;
    }
    Reflect.defineMetadata(INTERCEPTORS_METADATA, interceptors, target);
    return target;
  };
}
