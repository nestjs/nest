"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_exception_1 = require("./http.exception");
const http_status_enum_1 = require("../enums/http-status.enum");
const http_exception_body_util_1 = require("../utils/http-exception-body.util");
class NotImplementedException extends http_exception_1.HttpException {
    constructor(message, error = 'Not Implemented') {
        super(http_exception_body_util_1.createHttpExceptionBody(message, error, http_status_enum_1.HttpStatus.NOT_IMPLEMENTED), http_status_enum_1.HttpStatus.NOT_IMPLEMENTED);
    }
}
exports.NotImplementedException = NotImplementedException;
