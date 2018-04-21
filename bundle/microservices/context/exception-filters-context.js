"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const rpc_exceptions_handler_1 = require("../exceptions/rpc-exceptions-handler");
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const base_exception_filter_context_1 = require("@nestjs/core/exceptions/base-exception-filter-context");
class ExceptionFiltersContext extends base_exception_filter_context_1.BaseExceptionFilterContext {
    constructor(container, config) {
        super(container);
        this.config = config;
    }
    create(instance, callback, module) {
        this.moduleContext = module;
        const exceptionHandler = new rpc_exceptions_handler_1.RpcExceptionsHandler();
        const filters = this.createContext(instance, callback, constants_1.EXCEPTION_FILTERS_METADATA);
        if (shared_utils_1.isEmpty(filters)) {
            return exceptionHandler;
        }
        exceptionHandler.setCustomFilters(filters);
        return exceptionHandler;
    }
    getGlobalMetadata() {
        return this.config.getGlobalFilters();
    }
}
exports.ExceptionFiltersContext = ExceptionFiltersContext;
