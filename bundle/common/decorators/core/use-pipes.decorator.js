"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
const extend_metadata_util_1 = require("../../utils/extend-metadata.util");
const validate_each_util_1 = require("../../utils/validate-each.util");
const shared_utils_1 = require("../../utils/shared.utils");
/**
 * Binds pipes to the particular context.
 * When the `@UsePipes()` is used on the controller level:
 * - Pipe will be register to each handler (every method)
 *
 * When the `@UsePipes()` is used on the handle level:
 * - Pipe will be registered only to specified method
 *
 * @param  {PipeTransform[]} ...pipes
 */
function UsePipes(...pipes) {
    return (target, key, descriptor) => {
        const isPipeValid = pipe => pipe && (shared_utils_1.isFunction(pipe) || shared_utils_1.isFunction(pipe.transform));
        if (descriptor) {
            extend_metadata_util_1.extendArrayMetadata(constants_1.PIPES_METADATA, pipes, descriptor.value);
            return descriptor;
        }
        validate_each_util_1.validateEach(target, pipes, isPipeValid, '@UsePipes', 'pipe');
        extend_metadata_util_1.extendArrayMetadata(constants_1.PIPES_METADATA, pipes, target);
        return target;
    };
}
exports.UsePipes = UsePipes;
