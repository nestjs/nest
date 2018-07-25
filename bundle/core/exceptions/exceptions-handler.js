"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const constants_1 = require("../constants");
const invalid_exception_filter_exception_1 = require("../errors/exceptions/invalid-exception-filter.exception");
class ExceptionsHandler {
    constructor(applicationRef) {
        this.applicationRef = applicationRef;
        this.filters = [];
    }
    next(exception, ctx) {
        if (this.invokeCustomFilters(exception, ctx))
            return;
        if (!(exception instanceof common_1.HttpException)) {
            const body = {
                statusCode: 500,
                message: constants_1.messages.UNKNOWN_EXCEPTION_MESSAGE,
            };
            this.applicationRef.reply(ctx.getArgByIndex(1), body, body.statusCode);
            if (this.isExceptionObject(exception)) {
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
        this.applicationRef.reply(ctx.getArgByIndex(1), message, exception.getStatus());
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
    isExceptionObject(err) {
        return shared_utils_1.isObject(err) && !!err.message;
    }
}
ExceptionsHandler.logger = new common_1.Logger(ExceptionsHandler.name);
exports.ExceptionsHandler = ExceptionsHandler;
