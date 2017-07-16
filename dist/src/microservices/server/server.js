"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_service_1 = require("@nestjs/common/services/logger.service");
const Observable_1 = require("rxjs/Observable");
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
        stream$.catch((err) => {
            respond({ err, response: null });
            return Observable_1.Observable.empty();
        })
            .finally(() => respond({ disposed: true }))
            .subscribe((response) => respond({ err: null, response }));
    }
    handleError(error) {
        this.logger.error(error);
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map