"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
exports.Catch = (...exceptions) => {
    return (target) => {
        Reflect.defineMetadata(constants_1.FILTER_CATCH_EXCEPTIONS, exceptions, target);
    };
};
//# sourceMappingURL=catch.decorator.js.map