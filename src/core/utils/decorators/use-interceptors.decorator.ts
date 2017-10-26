import { INTERCEPTORS_METADATA } from '../../constants';

/**
 * Setups interceptors to the chosen context.
 * When the `@UseInterceptors()` is used on the controller level:
 * - Interceptor will be setuped to the every handler (every method)
 *
 * When the `@UseInterceptors()` is used on the handle level:
 * - Interceptor will be setuped only to specified method
 *
 * @param  {} ...interceptors (types)
 */
export function UseInterceptors(...interceptors) {
    return (target: object, key?, descriptor?) => {
        if (descriptor) {
            Reflect.defineMetadata(INTERCEPTORS_METADATA, interceptors, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(INTERCEPTORS_METADATA, interceptors, target);
        return target;
    };
}
