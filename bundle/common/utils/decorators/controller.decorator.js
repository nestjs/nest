"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const shared_utils_1 = require("../shared.utils");
const constants_1 = require("../../constants");
/**
 * Defines the Controller. The controller can inject dependencies through constructor.
 * Those dependencies should belongs to the same module.
 */
function Controller(prefix) {
    const path = shared_utils_1.isUndefined(prefix) ? '/' : prefix;
    return (target) => {
        Reflect.defineMetadata(constants_1.PATH_METADATA, path, target);
    };
}
exports.Controller = Controller;
