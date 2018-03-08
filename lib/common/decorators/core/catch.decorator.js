"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
/**
 * Defines the Exceptions Filter. Takes set of exception types as an argument which has to be caught by this Filter.
 * The class should implement the `ExceptionFilter` interface.
 */
function Catch(...exceptions) {
    return (target) => {
        Reflect.defineMetadata(constants_1.FILTER_CATCH_EXCEPTIONS, exceptions, target);
    };
}
exports.Catch = Catch;
