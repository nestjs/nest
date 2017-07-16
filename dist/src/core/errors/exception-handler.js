"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("./exceptions/runtime.exception");
const logger_service_1 = require("@nestjs/common/services/logger.service");
class ExceptionHandler {
    constructor() {
        this.logger = new logger_service_1.Logger(ExceptionHandler.name);
    }
    handle(exception) {
        if (!(exception instanceof runtime_exception_1.RuntimeException)) {
            this.logger.error(exception.message, exception.stack);
            return;
        }
        this.logger.error(exception.what(), exception.stack);
    }
}
exports.ExceptionHandler = ExceptionHandler;
//# sourceMappingURL=exception-handler.js.map