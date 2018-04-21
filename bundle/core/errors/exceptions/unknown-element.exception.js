"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("./runtime.exception");
class UnknownElementException extends runtime_exception_1.RuntimeException {
    constructor() {
        super('Nest cannot find given element (it does not exist in current context)');
    }
}
exports.UnknownElementException = UnknownElementException;
