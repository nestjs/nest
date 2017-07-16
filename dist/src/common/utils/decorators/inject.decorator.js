"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
const shared_utils_1 = require("../shared.utils");
exports.Inject = (param) => {
    return (target, key, index) => {
        const args = Reflect.getMetadata(constants_1.SELF_DECLARED_DEPS_METADATA, target) || [];
        const type = shared_utils_1.isFunction(param) ? param.name : param;
        args.push({ index, param: type });
        Reflect.defineMetadata(constants_1.SELF_DECLARED_DEPS_METADATA, args, target);
    };
};
//# sourceMappingURL=inject.decorator.js.map