"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("./runtime.exception");
const messages_1 = require("../messages");
class UnknownDependenciesException extends runtime_exception_1.RuntimeException {
    constructor(type) {
        super(messages_1.UnknownDependenciesMessage(type));
    }
}
exports.UnknownDependenciesException = UnknownDependenciesException;
//# sourceMappingURL=unknown-dependencies.exception.js.map