"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const invalid_exception_filter_exception_1 = require("../errors/exceptions/invalid-exception-filter.exception");
const common_2 = require("@nestjs/common");
class ExceptionsHandler {
    constructor() {
        this.filters = [];
    }
    next(exception, response) {
        if (this.invokeCustomFilters(exception, response))
            return;
        if (!(exception instanceof common_2.HttpException)) {
            response.status(500).json({
                statusCode: 500,
                message: constants_1.messages.UNKNOWN_EXCEPTION_MESSAGE,
            });
            if (shared_utils_1.isObject(exception) && exception.message) {
                return ExceptionsHandler.logger.error(exception.message, exception.stack);
            }
            return ExceptionsHandler.logger.error(exception);
        }
        const res = exception.getResponse();
        const message = shared_utils_1.isObject(res)
            ? res
            : {
                statusCode: exception.getStatus(),
                message: res,
            };
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
            const hasMetatype = !exceptionMetatypes.length ||
                !!exceptionMetatypes.find(ExceptionMetatype => exception instanceof ExceptionMetatype);
            return hasMetatype;
        });
        filter && filter.func(exception, response);
        return !!filter;
    }
}
ExceptionsHandler.logger = new common_1.Logger(ExceptionsHandler.name);
exports.ExceptionsHandler = ExceptionsHandler;
