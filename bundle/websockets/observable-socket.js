"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
class ObservableSocket {
    static create(server) {
        return {
            init: new rxjs_1.ReplaySubject(),
            connection: new rxjs_1.Subject(),
            disconnect: new rxjs_1.Subject(),
            server,
        };
    }
}
exports.ObservableSocket = ObservableSocket;
