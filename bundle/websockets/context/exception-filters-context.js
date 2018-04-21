"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const base_exception_filter_context_1 = require("@nestjs/core/exceptions/base-exception-filter-context");
const ws_exceptions_handler_1 = require("../exceptions/ws-exceptions-handler");
class ExceptionFiltersContext extends base_exception_filter_context_1.BaseExceptionFilterContext {
    constructor(container) {
        super(container);
    }
    create(instance, callback, module) {
        this.moduleContext = module;
        const exceptionHandler = new ws_exceptions_handler_1.WsExceptionsHandler();
        const filters = this.createContext(instance, callback, constants_1.EXCEPTION_FILTERS_METADATA);
        if (shared_utils_1.isEmpty(filters)) {
            return exceptionHandler;
        }
        exceptionHandler.setCustomFilters(filters);
        return exceptionHandler;
    }
    getGlobalMetadata() {
        return [];
    }
}
exports.ExceptionFiltersContext = ExceptionFiltersContext;
