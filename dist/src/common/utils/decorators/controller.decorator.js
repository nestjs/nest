"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const shared_utils_1 = require("../shared.utils");
const constants_1 = require("../../constants");
exports.Controller = (metadata) => {
    let path = shared_utils_1.isObject(metadata) ? metadata[constants_1.PATH_METADATA] : metadata;
    path = shared_utils_1.isUndefined(path) ? '/' : path;
    return (target) => {
        Reflect.defineMetadata(constants_1.PATH_METADATA, path, target);
    };
};
//# sourceMappingURL=controller.decorator.js.map