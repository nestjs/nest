"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
/**
 * Binds guards to the particular context.
 * When the `@UseGuards()` is used on the controller level:
 * - Guard will be register to each handler (every method)
 *
 * When the `@UseGuards()` is used on the handler level:
 * - Guard will be registered only to specified method
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
