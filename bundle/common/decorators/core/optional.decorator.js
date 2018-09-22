"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
/**
 * Sets dependency as an optional one.
 */
function Optional() {
    return (target, key, index) => {
        const args = Reflect.getMetadata(constants_1.OPTIONAL_DEPS_METADATA, target) || [];
        Reflect.defineMetadata(constants_1.OPTIONAL_DEPS_METADATA, [...args, index], target);
    };
}
exports.Optional = Optional;
