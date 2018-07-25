"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("@nestjs/core/errors/exceptions/runtime.exception");
class InvalidGrpcPackageException extends runtime_exception_1.RuntimeException {
    constructor() {
        super('The invalid gRPC package (package not found)');
    }
}
exports.InvalidGrpcPackageException = InvalidGrpcPackageException;
