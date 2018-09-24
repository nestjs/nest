"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_exception_1 = require("./http.exception");
const http_status_enum_1 = require("../enums/http-status.enum");
const http_exception_body_util_1 = require("../utils/http-exception-body.util");
class ConflictException extends http_exception_1.HttpException {
    constructor(message, error = 'Conflict') {
        super(http_exception_body_util_1.createHttpExceptionBody(message, error, http_status_enum_1.HttpStatus.CONFLICT), http_status_enum_1.HttpStatus.CONFLICT);
    }
}
exports.ConflictException = ConflictException;
