"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("@nestjs/core/errors/exceptions/runtime.exception");
class InvalidProtoDefinitionException extends runtime_exception_1.RuntimeException {
    constructor() {
        super('The invalid .proto definition (file not found)');
    }
}
exports.InvalidProtoDefinitionException = InvalidProtoDefinitionException;
