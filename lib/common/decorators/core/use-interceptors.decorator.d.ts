/**
 * Setups interceptors to the chosen context.
 * When the `@UseInterceptors()` is used on the controller level:
 * - Interceptor will be set up to every handler (every method)
 *
 * When the `@UseInterceptors()` is used on the handle level:
 * - Interceptor will be set up only to specified method
 *
 * @param  {} ...interceptors (types)
 */
export declare function UseInterceptors(...interceptors: any[]): (target: object, key?: any, descriptor?: any) => any;
