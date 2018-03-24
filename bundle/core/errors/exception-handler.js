"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("./exceptions/runtime.exception");
const logger_service_1 = require("@nestjs/common/services/logger.service");
class ExceptionHandler {
    handle(exception) {
        if (!(exception instanceof runtime_exception_1.RuntimeException)) {
            ExceptionHandler.logger.error(exception.message, exception.stack);
            return;
        }
        ExceptionHandler.logger.error(exception.what(), exception.stack);
    }
}
ExceptionHandler.logger = new logger_service_1.Logger(ExceptionHandler.name);
exports.ExceptionHandler = ExceptionHandler;
