"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const constants_1 = require("../constants");
const invalid_message_exception_1 = require("../exceptions/invalid-message.exception");
class ClientProxy {
    send(pattern, data) {
        if (shared_utils_1.isNil(pattern) || shared_utils_1.isNil(data)) {
            return rxjs_1.throwError(new invalid_message_exception_1.InvalidMessageException());
        }
        return new rxjs_1.Observable((observer) => {
            this.publish({ pattern, data }, this.createObserver(observer));
        });
    }
    createObserver(observer) {
        return ({ err, response, isDisposed }) => {
            if (err) {
                return observer.error(err);
            }
            else if (isDisposed) {
                return observer.complete();
            }
            observer.next(response);
        };
    }
    assignPacketId(packet) {
        const id = Math.random()
            .toString(36)
            .substr(2, 5) + Date.now();
        return Object.assign(packet, { id });
    }
    connect$(instance, errorEvent = constants_1.ERROR_EVENT, connectEvent = constants_1.CONNECT_EVENT) {
        const error$ = rxjs_1.fromEvent(instance, errorEvent).pipe(operators_1.map(err => {
            throw err;
        }));
        const connect$ = rxjs_1.fromEvent(instance, connectEvent);
        return rxjs_1.merge(error$, connect$).pipe(operators_1.take(1));
    }
    getOptionsProp(obj, prop, defaultValue = undefined) {
        return obj && obj.options ? obj.options[prop] : defaultValue;
    }
}
exports.ClientProxy = ClientProxy;
