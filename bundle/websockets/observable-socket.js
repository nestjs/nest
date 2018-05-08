"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
class ObservableSocket {
    static create(server) {
        const init = new rxjs_1.ReplaySubject();
        init.next(server);
        return {
            init,
            connection: new rxjs_1.Subject(),
            disconnect: new rxjs_1.Subject(),
            server,
        };
    }
}
exports.ObservableSocket = ObservableSocket;
