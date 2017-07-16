"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("./runtime.exception");
const messages_1 = require("../messages");
class InvalidMiddlewareException extends runtime_exception_1.RuntimeException {
    constructor(name) {
        super(messages_1.InvalidMiddlewareMessage(name));
    }
}
exports.InvalidMiddlewareException = InvalidMiddlewareException;
//# sourceMappingURL=invalid-middleware.exception.js.map