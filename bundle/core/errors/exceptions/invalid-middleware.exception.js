"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messages_1 = require("../messages");
const runtime_exception_1 = require("./runtime.exception");
class InvalidMiddlewareException extends runtime_exception_1.RuntimeException {
    constructor(name) {
        super(messages_1.INVALID_MIDDLEWARE_MESSAGE `${name}`);
    }
}
exports.InvalidMiddlewareException = InvalidMiddlewareException;
