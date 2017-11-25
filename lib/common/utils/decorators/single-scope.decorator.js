"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
/**
 * Makes the module single-scoped (not singleton).
 * Nest will always create the new instance of the module, when it's imported by another one.
 */
function SingleScope() {
    return (target) => {
        const Metatype = target;
        const Type = class extends Metatype {
            constructor(...args) {
                super(...args);
            }
        };
        Reflect.defineMetadata(constants_1.SHARED_MODULE_METADATA, true, Type);
        Object.defineProperty(Type, 'name', { value: target.name });
        return Type;
    };
}
exports.SingleScope = SingleScope;
;
