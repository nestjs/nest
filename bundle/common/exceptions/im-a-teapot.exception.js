"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_exception_1 = require("./http.exception");
const http_status_enum_1 = require("../enums/http-status.enum");
const http_exception_body_util_1 = require("../utils/http-exception-body.util");
/**
 * Any attempt to brew coffee with a teapot should result in the error code "418 I'm a teapot".
 * The resulting entity body MAY be short and stout.
 *
 * http://save418.com/
 */
class ImATeapotException extends http_exception_1.HttpException {
    constructor(message, error = 'I\'m a teapot') {
        super(http_exception_body_util_1.createHttpExceptionBody(message, error, http_status_enum_1.HttpStatus.I_AM_A_TEAPOT), http_status_enum_1.HttpStatus.I_AM_A_TEAPOT);
    }
}
exports.ImATeapotException = ImATeapotException;
