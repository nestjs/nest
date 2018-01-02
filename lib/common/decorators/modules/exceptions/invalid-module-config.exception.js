"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
class InvalidModuleConfigException extends Error {
    constructor(property) {
        super(constants_1.InvalidModuleConfigMessage(property));
    }
}
exports.InvalidModuleConfigException = InvalidModuleConfigException;
