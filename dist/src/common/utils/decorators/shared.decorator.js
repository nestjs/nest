"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
exports.Shared = (token = 'global') => {
    return (target) => {
        const Type = class extends target {
            constructor(...args) {
                super(...args);
            }
        };
        Reflect.defineMetadata(constants_1.SHARED_MODULE_METADATA, token, Type);
        Object.defineProperty(Type, 'name', { value: target.name });
        return Type;
    };
};
//# sourceMappingURL=shared.decorator.js.map