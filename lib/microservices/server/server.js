"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_service_1 = require("@nestjs/common/services/logger.service");
const Observable_1 = require("rxjs/Observable");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
require("rxjs/add/operator/catch");
require("rxjs/add/operator/finally");
require("rxjs/add/observable/empty");
require("rxjs/add/observable/of");
require("rxjs/add/observable/fromPromise");
class Server {
    constructor() {
        this.messageHandlers = {};
        this.logger = new logger_service_1.Logger(Server.name);
    }
    getHandlers() {
        return this.messageHandlers;
    }
    add(pattern, callback) {
        this.messageHandlers[JSON.stringify(pattern)] = callback;
    }
    send(stream$, respond) {
        return stream$
            .catch(err => {
            respond({ err, response: null });
            return Observable_1.Observable.empty();
        })
            .finally(() => respond({ disposed: true }))
            .subscribe(response => respond({ err: null, response }));
    }
    transformToObservable(resultOrDeffered) {
        if (resultOrDeffered instanceof Promise) {
            return Observable_1.Observable.fromPromise(resultOrDeffered);
        }
        else if (!(resultOrDeffered && shared_utils_1.isFunction(resultOrDeffered.subscribe))) {
            return Observable_1.Observable.of(resultOrDeffered);
        }
        return resultOrDeffered;
    }
    handleError(error) {
        this.logger.error(error);
    }
}
exports.Server = Server;
