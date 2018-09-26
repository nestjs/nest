"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_exception_1 = require("./http.exception");
const http_status_enum_1 = require("../enums/http-status.enum");
const http_exception_body_util_1 = require("../utils/http-exception-body.util");
class MethodNotAllowedException extends http_exception_1.HttpException {
    constructor(message, error = 'Method Not Allowed') {
        super(http_exception_body_util_1.createHttpExceptionBody(message, error, http_status_enum_1.HttpStatus.METHOD_NOT_ALLOWED), http_status_enum_1.HttpStatus.METHOD_NOT_ALLOWED);
    }
}
exports.MethodNotAllowedException = MethodNotAllowedException;
