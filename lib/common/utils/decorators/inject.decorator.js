"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
const shared_utils_1 = require("../shared.utils");
/**
 * Injects component, which has to be available in the current injector (module) scope.
 * Components are recognized by types / or tokens.
 */
function Inject(token) {
    return (target, key, index) => {
        const args = Reflect.getMetadata(constants_1.SELF_DECLARED_DEPS_METADATA, target) || [];
        const type = shared_utils_1.isFunction(token) ? token.name : token;
        args.push({ index, param: type });
        Reflect.defineMetadata(constants_1.SELF_DECLARED_DEPS_METADATA, args, target);
    };
}
exports.Inject = Inject;
