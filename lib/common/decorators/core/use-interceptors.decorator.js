"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
const extend_metadata_util_1 = require("../../utils/extend-metadata.util");
const shared_utils_1 = require("../../utils/shared.utils");
const validate_each_util_1 = require("../../utils/validate-each.util");
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
function UseInterceptors(...interceptors) {
    return (target, key, descriptor) => {
        if (descriptor) {
            validate_each_util_1.validateEach(target.constructor, interceptors, shared_utils_1.isFunction, '@UseInterceptors', 'interceptor');
            extend_metadata_util_1.extendArrayMetadata(constants_1.INTERCEPTORS_METADATA, interceptors, descriptor.value);
            return descriptor;
        }
        validate_each_util_1.validateEach(target, interceptors, shared_utils_1.isFunction, '@UseInterceptors', 'interceptor');
        extend_metadata_util_1.extendArrayMetadata(constants_1.INTERCEPTORS_METADATA, interceptors, target);
        return target;
    };
}
exports.UseInterceptors = UseInterceptors;
