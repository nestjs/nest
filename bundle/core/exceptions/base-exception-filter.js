"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const constants_1 = require("../constants");
class BaseExceptionFilter {
    constructor(applicationRef) {
        this.applicationRef = applicationRef;
    }
    catch(exception, host) {
        if (!(exception instanceof common_1.HttpException)) {
            const body = {
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: constants_1.MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
            };
            this.applicationRef.reply(host.getArgByIndex(1), body, body.statusCode);
            if (this.isExceptionObject(exception)) {
                return BaseExceptionFilter.logger.error(exception.message, exception.stack);
            }
            return BaseExceptionFilter.logger.error(exception);
        }
        const res = exception.getResponse();
        const message = shared_utils_1.isObject(res)
            ? res
            : {
                statusCode: exception.getStatus(),
                message: res,
            };
        this.applicationRef.reply(host.getArgByIndex(1), message, exception.getStatus());
    }
    isExceptionObject(err) {
        return shared_utils_1.isObject(err) && !!err.message;
    }
}
BaseExceptionFilter.logger = new common_1.Logger('ExceptionsHandler');
exports.BaseExceptionFilter = BaseExceptionFilter;
