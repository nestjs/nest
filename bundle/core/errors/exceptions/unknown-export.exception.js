"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messages_1 = require("../messages");
const runtime_exception_1 = require("./runtime.exception");
class UnknownExportException extends runtime_exception_1.RuntimeException {
    constructor(name) {
        super(messages_1.UNKNOWN_EXPORT_MESSAGE `${name}`);
    }
}
exports.UnknownExportException = UnknownExportException;
