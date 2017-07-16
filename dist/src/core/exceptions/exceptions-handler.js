"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_exception_1 = require("./http-exception");
const constants_1 = require("../constants");
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const invalid_exception_filter_exception_1 = require("../errors/exceptions/invalid-exception-filter.exception");
class ExceptionsHandler {
    constructor() {
        this.logger = new common_1.Logger(ExceptionsHandler.name);
        this.filters = [];
    }
    next(exception, response) {
        if (this.invokeCustomFilters(exception, response))
            return;
        if (!(exception instanceof http_exception_1.HttpException)) {
            response.status(500).json({ message: constants_1.messages.UNKNOWN_EXCEPTION_MESSAGE });
            this.logger.error(exception.message, exception.stack);
            return;
        }
        const res = exception.getResponse();
        const message = shared_utils_1.isObject(res) ? res : ({ message: res });
        response.status(exception.getStatus()).json(message);
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
            const hasMetatype = !!exceptionMetatypes.find(ExceptionMetatype => exception instanceof ExceptionMetatype);
            return hasMetatype;
        });
        filter && filter.func(exception, response);
        return !!filter;
    }
}
exports.ExceptionsHandler = ExceptionsHandler;
//# sourceMappingURL=exceptions-handler.js.map