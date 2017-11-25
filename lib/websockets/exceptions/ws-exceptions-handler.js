"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@nestjs/core/constants");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const invalid_exception_filter_exception_1 = require("@nestjs/core/errors/exceptions/invalid-exception-filter.exception");
const ws_exception_1 = require("../exceptions/ws-exception");
class WsExceptionsHandler {
    constructor() {
        this.filters = [];
    }
    handle(exception, client) {
        if (this.invokeCustomFilters(exception, client) || !client.emit)
            return;
        const status = 'error';
        if (!(exception instanceof ws_exception_1.WsException)) {
            const message = constants_1.messages.UNKNOWN_EXCEPTION_MESSAGE;
            return client.emit('exception', { status, message });
        }
        const result = exception.getError();
        const message = shared_utils_1.isObject(result) ? result : ({
            status,
            message: result,
        });
        client.emit('exception', message);
    }
    setCustomFilters(filters) {
        if (!Array.isArray(filters)) {
            throw new invalid_exception_filter_exception_1.InvalidExceptionFilterException();
        }
        this.filters = filters;
    }
    invokeCustomFilters(exception, client) {
        if (shared_utils_1.isEmpty(this.filters))
            return false;
        const filter = this.filters.find(({ exceptionMetatypes, func }) => {
            const hasMetatype = !!exceptionMetatypes.find(ExceptionMetatype => exception instanceof ExceptionMetatype);
            return hasMetatype;
        });
        filter && filter.func(exception, client);
        return !!filter;
    }
}
exports.WsExceptionsHandler = WsExceptionsHandler;
