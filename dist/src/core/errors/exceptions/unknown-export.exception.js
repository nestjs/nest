"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("./runtime.exception");
const messages_1 = require("../messages");
class UnknownExportException extends runtime_exception_1.RuntimeException {
    constructor(name) {
        super(messages_1.UnknownExportMessage(name));
    }
}
exports.UnknownExportException = UnknownExportException;
//# sourceMappingURL=unknown-export.exception.js.map