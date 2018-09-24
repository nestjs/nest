"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messages_1 = require("../messages");
const runtime_exception_1 = require("./runtime.exception");
class InvalidModuleException extends runtime_exception_1.RuntimeException {
    constructor(trace) {
        const scope = (trace || []).map(module => module.name).join(' -> ');
        super(messages_1.INVALID_MODULE_MESSAGE `${scope}`);
    }
}
exports.InvalidModuleException = InvalidModuleException;
