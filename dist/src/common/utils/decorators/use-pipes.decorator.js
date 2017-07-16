"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
exports.UsePipes = (...pipes) => {
    return (target, key, descriptor) => {
        if (descriptor) {
            Reflect.defineMetadata(constants_1.PIPES_METADATA, pipes, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(constants_1.PIPES_METADATA, pipes, target);
        return target;
    };
};
//# sourceMappingURL=use-pipes.decorator.js.map