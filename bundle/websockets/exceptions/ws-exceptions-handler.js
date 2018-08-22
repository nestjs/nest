"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const invalid_exception_filter_exception_1 = require("@nestjs/core/errors/exceptions/invalid-exception-filter.exception");
const base_ws_exception_filter_1 = require("./base-ws-exception-filter");
class WsExceptionsHandler extends base_ws_exception_filter_1.BaseWsExceptionFilter {
    constructor() {
        super(...arguments);
        this.filters = [];
    }
    handle(exception, host) {
        const client = host.switchToWs().getClient();
        if (this.invokeCustomFilters(exception, host) || !client.emit) {
            return void 0;
        }
        super.catch(exception, host);
    }
    setCustomFilters(filters) {
        if (!Array.isArray(filters)) {
            throw new invalid_exception_filter_exception_1.InvalidExceptionFilterException();
        }
        this.filters = filters;
    }
    invokeCustomFilters(exception, args) {
        if (shared_utils_1.isEmpty(this.filters))
            return false;
        const filter = this.filters.find(({ exceptionMetatypes, func }) => {
            const hasMetatype = !exceptionMetatypes.length ||
                !!exceptionMetatypes.find(ExceptionMetatype => exception instanceof ExceptionMetatype);
            return hasMetatype;
        });
        filter && filter.func(exception, args);
        return !!filter;
    }
}
exports.WsExceptionsHandler = WsExceptionsHandler;
