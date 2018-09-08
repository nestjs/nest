"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("./runtime.exception");
const messages_1 = require("../messages");
class UnknownDependenciesException extends runtime_exception_1.RuntimeException {
    constructor(type, unknownDependencyContext) {
        super(messages_1.UnknownDependenciesMessage(type, unknownDependencyContext));
    }
}
exports.UnknownDependenciesException = UnknownDependenciesException;
