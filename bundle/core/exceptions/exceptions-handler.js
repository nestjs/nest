"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const invalid_exception_filter_exception_1 = require("../errors/exceptions/invalid-exception-filter.exception");
const base_exception_filter_1 = require("./base-exception-filter");
class ExceptionsHandler extends base_exception_filter_1.BaseExceptionFilter {
    constructor(applicationRef) {
        super(applicationRef);
        this.filters = [];
    }
    next(exception, ctx) {
        if (this.invokeCustomFilters(exception, ctx)) {
            return void 0;
        }
        super.catch(exception, ctx);
    }
    setCustomFilters(filters) {
        if (!Array.isArray(filters)) {
            throw new invalid_exception_filter_exception_1.InvalidExceptionFilterException();
        }
        this.filters = filters;
    }
    invokeCustomFilters(exception, response) {
        if (shared_utils_1.isEmpty(this.filters))
            return false;
        const filter = this.filters.find(({ exceptionMetatypes, func }) => {
            const hasMetatype = !exceptionMetatypes.length ||
                !!exceptionMetatypes.find(ExceptionMetatype => exception instanceof ExceptionMetatype);
            return hasMetatype;
        });
        filter && filter.func(exception, response);
        return !!filter;
    }
}
exports.ExceptionsHandler = ExceptionsHandler;
