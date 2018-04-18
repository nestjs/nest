"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
/**
 * Binds pipes to the particular context.
 * When the `@UsePipes()` is used on the controller level:
 * - Pipe will be register to each handler (every method)
 *
 * When the `@UsePipes()` is used on the handle level:
 * - Pipe will be registered only to specified method
 *
 * @param  {PipeTransform[]} ...pipes (instances)
 */
function UsePipes(...pipes) {
    return (target, key, descriptor) => {
        if (descriptor) {
            Reflect.defineMetadata(constants_1.PIPES_METADATA, pipes, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(constants_1.PIPES_METADATA, pipes, target);
        return target;
    };
}
exports.UsePipes = UsePipes;
