"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const random_string_generator_util_1 = require("@nestjs/common/utils/random-string-generator.util");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const constants_1 = require("../constants");
const invalid_message_exception_1 = require("../exceptions/errors/invalid-message.exception");
class ClientProxy {
    send(pattern, data) {
        if (shared_utils_1.isNil(pattern) || shared_utils_1.isNil(data)) {
            return rxjs_1.throwError(new invalid_message_exception_1.InvalidMessageException());
        }
        return rxjs_1.defer(async () => await this.connect()).pipe(operators_1.mergeMap(() => new rxjs_1.Observable((observer) => {
            const callback = this.createObserver(observer);
            return this.publish({ pattern, data }, callback);
        })));
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
        const id = random_string_generator_util_1.randomStringGenerator();
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
        return obj ? obj[prop] : defaultValue;
    }
    normalizePattern(pattern) {
        return pattern && shared_utils_1.isString(pattern) ? pattern : JSON.stringify(pattern);
    }
}
exports.ClientProxy = ClientProxy;
