"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("./runtime.exception");
const messages_1 = require("../messages");
class UndefinedDependencyException extends runtime_exception_1.RuntimeException {
    constructor(type, undefinedDependencyContext) {
        super(messages_1.UnknownDependenciesMessage(type, undefinedDependencyContext));
    }
}
exports.UndefinedDependencyException = UndefinedDependencyException;
