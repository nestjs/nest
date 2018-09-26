"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messages_1 = require("../messages");
const runtime_exception_1 = require("./runtime.exception");
class UnknownDependenciesException extends runtime_exception_1.RuntimeException {
    constructor(type, unknownDependencyContext) {
        super(messages_1.UNKNOWN_DEPENDENCIES_MESSAGE(type, unknownDependencyContext));
    }
}
exports.UnknownDependenciesException = UnknownDependenciesException;
