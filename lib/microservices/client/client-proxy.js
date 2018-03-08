"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Observable_1 = require("rxjs/Observable");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const invalid_message_exception_1 = require("../exceptions/invalid-message.exception");
const throw_1 = require("rxjs/observable/throw");
class ClientProxy {
    send(pattern, data) {
        if (shared_utils_1.isNil(pattern) || shared_utils_1.isNil(data)) {
            return throw_1._throw(new invalid_message_exception_1.InvalidMessageException());
        }
        return new Observable_1.Observable((observer) => {
            this.sendMessage({ pattern, data }, this.createObserver(observer));
        });
    }
    createObserver(observer) {
        return (err, result, disposed) => {
            if (err) {
                return observer.error(err);
            }
            else if (disposed) {
                return observer.complete();
            }
            observer.next(result);
        };
    }
}
exports.ClientProxy = ClientProxy;
