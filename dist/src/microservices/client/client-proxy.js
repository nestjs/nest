"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Observable_1 = require("rxjs/Observable");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const invalid_message_exception_1 = require("../exceptions/invalid-message.exception");
class ClientProxy {
    send(pattern, data) {
        if (shared_utils_1.isNil(pattern) || shared_utils_1.isNil(data)) {
            return Observable_1.Observable.throw(new invalid_message_exception_1.InvalidMessageException());
        }
        return Observable_1.Observable.create((observer) => {
            this.sendSingleMessage({ pattern, data }, this.createObserver(observer));
        });
    }
    createObserver(observer) {
        return (err, result, disposed) => {
            if (err) {
                observer.error(err);
                return;
            }
            else if (disposed) {
                observer.complete();
                return;
            }
            observer.next(result);
        };
    }
}
exports.ClientProxy = ClientProxy;
//# sourceMappingURL=client-proxy.js.map