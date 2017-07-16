"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
exports.UseGuards = (...guards) => {
    return (target, key, descriptor) => {
        if (descriptor) {
            Reflect.defineMetadata(constants_1.GUARDS_METADATA, guards, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(constants_1.GUARDS_METADATA, guards, target);
        return target;
    };
};
//# sourceMappingURL=use-guards.decorator.js.map