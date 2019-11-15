import { INTERCEPTORS_METADATA } from '../../constants';
import { NestRouterRenderInterceptor } from '../../interfaces';
import { extendArrayMetadata } from '../../utils/extend-metadata.util';
import { isFunction } from '../../utils/shared.utils';
import { validateEach } from '../../utils/validate-each.util';

/**
 * Decorator that binds render interceptors to the scope of the controller or method,
 * depending on its context.
 *
 * When `@UseRenderInterceptors` is used at the controller level, the interceptor will
 * be applied to every handler (method) in the controller.
 *
 * When `@UseRenderInterceptors` is used at the individual handler level, the interceptor
 * will apply only to that specific method.
 *
 * @param interceptors a single render interceptor instance or class, or a list of
 * render interceptor instances or classes.
 *
 * @see [Interceptors](https://docs.nestjs.com/interceptors)
 *
 * @usageNotes
 * Interceptors can also be set up globally for all controllers and routes
 * using `app.useGlobalRouterRenderInterceptors()`.  [See here for details](https://docs.nestjs.com/interceptors#binding-interceptors)
 *
 * @publicApi
 */
export function UseRouterRenderInterceptors(
  ...interceptors: (NestRouterRenderInterceptor | Function)[]
) {
  return (target: any, key?: string, descriptor?: any) => {
    const isValidInterceptor = <T extends Function | Record<string, any>>(
      interceptor: T,
    ) =>
      interceptor &&
      (isFunction(interceptor) ||
        (!(interceptor as Record<string, any>).intercept &&
          isFunction((interceptor as Record<string, any>).renderIntercept)));
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
