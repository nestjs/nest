"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const invalid_exception_filter_exception_1 = require("@nestjs/core/errors/exceptions/invalid-exception-filter.exception");
const constants_1 = require("@nestjs/core/constants");
const rpc_exception_1 = require("./rpc-exception");
const throw_1 = require("rxjs/observable/throw");
class RpcExceptionsHandler {
    constructor() {
        this.filters = [];
    }
    handle(exception, host) {
        const filterResult$ = this.invokeCustomFilters(exception, host);
        if (filterResult$) {
            return filterResult$;
        }
        const status = 'error';
        if (!(exception instanceof rpc_exception_1.RpcException)) {
            const errorMessage = constants_1.messages.UNKNOWN_EXCEPTION_MESSAGE;
            const isError = shared_utils_1.isObject(exception) && exception.message;
            const loggerArgs = isError
                ? [exception.message, exception.stack]
                : [exception];
            const logger = RpcExceptionsHandler.logger;
            logger.error.apply(logger, loggerArgs);
            return throw_1._throw({ status, message: errorMessage });
        }
        const res = exception.getError();
        const message = shared_utils_1.isObject(res) ? res : { status, message: res };
        return throw_1._throw(message);
    }
    setCustomFilters(filters) {
        if (!Array.isArray(filters)) {
            throw new invalid_exception_filter_exception_1.InvalidExceptionFilterException();
        }
        this.filters = filters;
    }
    invokeCustomFilters(exception, host) {
        if (shared_utils_1.isEmpty(this.filters))
            return null;
        const filter = this.filters.find(({ exceptionMetatypes, func }) => {
            const hasMetatype = !exceptionMetatypes.length ||
                !!exceptionMetatypes.find(ExceptionMetatype => exception instanceof ExceptionMetatype);
            return hasMetatype;
        });
        return filter ? filter.func(exception, host) : null;
    }
}
RpcExceptionsHandler.logger = new common_1.Logger(RpcExceptionsHandler.name);
exports.RpcExceptionsHandler = RpcExceptionsHandler;
