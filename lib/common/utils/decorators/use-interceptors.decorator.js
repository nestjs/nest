"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
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
function UseInterceptors(...interceptors) {
    return (target, key, descriptor) => {
        if (descriptor) {
            Reflect.defineMetadata(constants_1.INTERCEPTORS_METADATA, interceptors, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(constants_1.INTERCEPTORS_METADATA, interceptors, target);
        return target;
    };
}
exports.UseInterceptors = UseInterceptors;
