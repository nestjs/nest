"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const constants_1 = require("@nestjs/core/constants");
const rxjs_1 = require("rxjs");
const rpc_exception_1 = require("./rpc-exception");
class BaseRpcExceptionFilter {
    catch(exception, host) {
        const status = 'error';
        if (!(exception instanceof rpc_exception_1.RpcException)) {
            const errorMessage = constants_1.MESSAGES.UNKNOWN_EXCEPTION_MESSAGE;
            const isError = shared_utils_1.isObject(exception) && exception.message;
            const loggerArgs = isError
                ? [
                    exception.message,
                    exception.stack,
                ]
                : [exception];
            const logger = BaseRpcExceptionFilter.logger;
            logger.error.apply(logger, loggerArgs);
            return rxjs_1.throwError({ status, message: errorMessage });
        }
        const res = exception.getError();
        const message = shared_utils_1.isObject(res) ? res : { status, message: res };
        return rxjs_1.throwError(message);
    }
}
BaseRpcExceptionFilter.logger = new common_1.Logger('RpcExceptionsHandler');
exports.BaseRpcExceptionFilter = BaseRpcExceptionFilter;
