"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
const extend_metadata_util_1 = require("../../utils/extend-metadata.util");
const validate_each_util_1 = require("../../utils/validate-each.util");
const shared_utils_1 = require("../../utils/shared.utils");
/**
 * Binds guards to the particular context.
 * When the `@UseGuards()` is used on the controller level:
 * - Guard will be register to each handler (every method)
 *
 * When the `@UseGuards()` is used on the handler level:
 * - Guard will be registered only to specified method
 *
 * @param  {} ...guards
 */
function UseGuards(...guards) {
    return (target, key, descriptor) => {
        const isValidGuard = guard => guard && (shared_utils_1.isFunction(guard) || shared_utils_1.isFunction(guard.canActivate));
        if (descriptor) {
            validate_each_util_1.validateEach(target.constructor, guards, isValidGuard, '@UseGuards', 'guard');
            extend_metadata_util_1.extendArrayMetadata(constants_1.GUARDS_METADATA, guards, descriptor.value);
            return descriptor;
        }
        validate_each_util_1.validateEach(target, guards, isValidGuard, '@UseGuards', 'guard');
        extend_metadata_util_1.extendArrayMetadata(constants_1.GUARDS_METADATA, guards, target);
        return target;
    };
}
exports.UseGuards = UseGuards;
