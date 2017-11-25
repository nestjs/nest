"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("@nestjs/core/errors/exceptions/runtime.exception");
class InvalidMessageException extends runtime_exception_1.RuntimeException {
    constructor() {
        super(`Invalid message pattern or data!`);
    }
}
exports.InvalidMessageException = InvalidMessageException;
