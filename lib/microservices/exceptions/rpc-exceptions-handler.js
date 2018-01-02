"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const invalid_exception_filter_exception_1 = require("@nestjs/core/errors/exceptions/invalid-exception-filter.exception");
const constants_1 = require("@nestjs/core/constants");
const Observable_1 = require("rxjs/Observable");
const rpc_exception_1 = require("./rpc-exception");
require("rxjs/add/observable/throw");
class RpcExceptionsHandler {
    constructor() {
        this.filters = [];
    }
    handle(exception) {
        const filterResult$ = this.invokeCustomFilters(exception);
        if (filterResult$) {
            return filterResult$;
        }
        const status = 'error';
        if (!(exception instanceof rpc_exception_1.RpcException)) {
            const message = constants_1.messages.UNKNOWN_EXCEPTION_MESSAGE;
            const isError = shared_utils_1.isObject(exception) && exception.message;
            const loggerArgs = isError
                ? [exception.message, exception.stack]
                : [exception];
            const logger = RpcExceptionsHandler.logger;
            logger.error.apply(logger, loggerArgs);
            return Observable_1.Observable.throw({ status, message });
        }
        const res = exception.getError();
        const message = shared_utils_1.isObject(res) ? res : { status, message: res };
        return Observable_1.Observable.throw(message);
    }
    setCustomFilters(filters) {
        if (!Array.isArray(filters)) {
            throw new invalid_exception_filter_exception_1.InvalidExceptionFilterException();
        }
        this.filters = filters;
    }
    invokeCustomFilters(exception) {
        if (shared_utils_1.isEmpty(this.filters))
            return null;
        const filter = this.filters.find(({ exceptionMetatypes, func }) => {
            const hasMetatype = !exceptionMetatypes.length ||
                !!exceptionMetatypes.find(ExceptionMetatype => exception instanceof ExceptionMetatype);
            return hasMetatype;
        });
        return filter ? filter.func(exception) : null;
    }
}
RpcExceptionsHandler.logger = new common_1.Logger(RpcExceptionsHandler.name);
exports.RpcExceptionsHandler = RpcExceptionsHandler;
