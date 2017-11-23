"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("./runtime.exception");
const messages_1 = require("../messages");
class InvalidModuleException extends runtime_exception_1.RuntimeException {
    constructor(trace) {
        const scope = (trace || []).map((module) => module.name).join(' -> ');
        super(messages_1.InvalidModuleMessage(scope));
    }
}
exports.InvalidModuleException = InvalidModuleException;
