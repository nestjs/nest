import { INTERCEPTORS_METADATA } from '../../constants';
import { NestInterceptor } from '../../interfaces';
import { extendArrayMetadata } from '../../utils/extend-metadata.util';
import { isFunction } from '../../utils/shared.utils';
import { validateEach } from '../../utils/validate-each.util';

/**
 * Binds interceptors to the particular context.
 * When the `@UseInterceptors()` is used on the controller level:
 * - Interceptor will be register to each handler (every method)
 *
 * When the `@UseInterceptors()` is used on the handle level:
 * - Interceptor will be registered only to the specified method
 *
 * @param  {} ...interceptors
 */
export function UseInterceptors(
  ...interceptors: (NestInterceptor | Function)[]
) {
  return (target: any, key?: string, descriptor?: any) => {
    const isValidInterceptor = <T extends Function | Record<string, any>>(
      interceptor: T,
    ) =>
      interceptor &&
      (isFunction(interceptor) ||
        isFunction((interceptor as Record<string, any>).intercept));

    if (descriptor) {
      validateEach(
        target.constructor,
        interceptors,
        isValidInterceptor,
        '@UseInterceptors',
        'interceptor',
      );
      extendArrayMetadata(
        INTERCEPTORS_METADATA,
        interceptors,
        descriptor.value,
      );
      return descriptor;
    }
    validateEach(
      target,
      interceptors,
      isValidInterceptor,
      '@UseInterceptors',
      'interceptor',
    );
    extendArrayMetadata(INTERCEPTORS_METADATA, interceptors, target);
    return target;
  };
}
