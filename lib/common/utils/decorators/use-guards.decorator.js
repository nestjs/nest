"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
/**
 * Setups guards to the chosen context.
 * When the `@UseGuards()` is used on the controller level:
 * - Guard will be set up to every handler (every method)
 *
 * When the `@UseGuards()` is used on the handle level:
 * - Guard will be set up only to specified method
 *
 * @param  {} ...guards (types)
 */
function UseGuards(...guards) {
    return (target, key, descriptor) => {
        if (descriptor) {
            Reflect.defineMetadata(constants_1.GUARDS_METADATA, guards, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(constants_1.GUARDS_METADATA, guards, target);
        return target;
    };
}
exports.UseGuards = UseGuards;
