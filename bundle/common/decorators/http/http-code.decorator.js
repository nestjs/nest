"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
/**
 * Defines the HTTP response status code.
 * It overrides default status code for the given request method.
 *
 * @param  {number} statusCode
 */
function HttpCode(statusCode) {
    return (target, key, descriptor) => {
        Reflect.defineMetadata(constants_1.HTTP_CODE_METADATA, statusCode, descriptor.value);
        return descriptor;
    };
}
exports.HttpCode = HttpCode;
