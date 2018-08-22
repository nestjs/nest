"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("@nestjs/core/errors/exceptions/runtime.exception");
class InvalidGrpcServiceException extends runtime_exception_1.RuntimeException {
    constructor() {
        super(`The invalid gRPC service (service not found)`);
    }
}
exports.InvalidGrpcServiceException = InvalidGrpcServiceException;
