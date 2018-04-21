"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("./runtime.exception");
const messages_1 = require("../messages");
class MissingRequiredDependencyException extends runtime_exception_1.RuntimeException {
    constructor(name, context) {
        super(messages_1.MissingRequiredDependency(name, context));
    }
}
exports.MissingRequiredDependencyException = MissingRequiredDependencyException;
