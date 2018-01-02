"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
/**
 * Makes the module global-scoped.
 * Once imported will be available for all of the existing modules.
 */
function Global() {
    return (target) => {
        Reflect.defineMetadata(constants_1.GLOBAL_MODULE_METADATA, true, target);
    };
}
exports.Global = Global;
