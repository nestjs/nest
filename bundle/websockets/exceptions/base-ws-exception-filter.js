"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const constants_1 = require("@nestjs/core/constants");
const ws_exception_1 = require("./ws-exception");
class BaseWsExceptionFilter {
    catch(exception, host) {
        const client = host.switchToWs().getClient();
        const status = 'error';
        if (!(exception instanceof ws_exception_1.WsException)) {
            const errorMessage = constants_1.MESSAGES.UNKNOWN_EXCEPTION_MESSAGE;
            return client.emit('exception', { status, message: errorMessage });
        }
        const result = exception.getError();
        const message = shared_utils_1.isObject(result)
            ? result
            : {
                status,
                message: result,
            };
        client.emit('exception', message);
    }
}
exports.BaseWsExceptionFilter = BaseWsExceptionFilter;
