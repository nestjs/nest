"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_service_1 = require("@nestjs/common/services/logger.service");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
class Server {
    constructor() {
        this.messageHandlers = {};
        this.logger = new logger_service_1.Logger(Server.name);
    }
    addHandler(pattern, callback) {
        const key = shared_utils_1.isString(pattern) ? pattern : JSON.stringify(pattern);
        this.messageHandlers[key] = callback;
    }
    getHandlers() {
        return this.messageHandlers;
    }
    getHandlerByPattern(pattern) {
        return this.messageHandlers[pattern] ? this.messageHandlers[pattern] : null;
    }
    send(stream$, respond) {
        return stream$
            .pipe(operators_1.catchError(err => {
            respond({ err, response: null });
            return rxjs_1.EMPTY;
        }), operators_1.finalize(() => respond({ isDisposed: true })))
            .subscribe(response => respond({ err: null, response }));
    }
    transformToObservable(resultOrDeffered) {
        if (resultOrDeffered instanceof Promise) {
            return rxjs_1.from(resultOrDeffered);
        }
        else if (!(resultOrDeffered && shared_utils_1.isFunction(resultOrDeffered.subscribe))) {
            return rxjs_1.of(resultOrDeffered);
        }
        return resultOrDeffered;
    }
    getOptionsProp(obj, prop, defaultValue = undefined) {
        return obj ? obj[prop] : defaultValue;
    }
    handleError(error) {
        this.logger.error(error);
    }
    loadPackage(name, ctx) {
        return load_package_util_1.loadPackage(name, ctx);
    }
}
exports.Server = Server;
