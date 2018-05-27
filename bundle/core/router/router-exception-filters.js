"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@nestjs/common/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
require("reflect-metadata");
const base_exception_filter_context_1 = require("../exceptions/base-exception-filter-context");
const exceptions_handler_1 = require("../exceptions/exceptions-handler");
class RouterExceptionFilters extends base_exception_filter_context_1.BaseExceptionFilterContext {
    constructor(container, config, applicationRef) {
        super(container);
        this.config = config;
        this.applicationRef = applicationRef;
    }
    create(instance, callback, module) {
        this.moduleContext = module;
        const exceptionHandler = new exceptions_handler_1.ExceptionsHandler(this.applicationRef);
        const filters = this.createContext(instance, callback, constants_1.EXCEPTION_FILTERS_METADATA);
        if (shared_utils_1.isEmpty(filters)) {
            return exceptionHandler;
        }
        exceptionHandler.setCustomFilters(filters.reverse());
        return exceptionHandler;
    }
    getGlobalMetadata() {
        return this.config.getGlobalFilters();
    }
}
exports.RouterExceptionFilters = RouterExceptionFilters;
