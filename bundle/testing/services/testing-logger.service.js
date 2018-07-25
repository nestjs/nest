"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
class TestingLogger extends common_1.Logger {
    constructor() {
        super('Testing');
    }
    log(message) { }
    warn(message) { }
    error(message, trace) {
        return common_1.Logger.error(message, trace, 'ExceptionHandler');
    }
}
exports.TestingLogger = TestingLogger;
