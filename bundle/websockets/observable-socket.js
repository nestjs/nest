"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Subject_1 = require("rxjs/Subject");
const ReplaySubject_1 = require("rxjs/ReplaySubject");
class ObservableSocket {
    static create(server) {
        return {
            init: new ReplaySubject_1.ReplaySubject(),
            connection: new Subject_1.Subject(),
            disconnect: new Subject_1.Subject(),
            server,
        };
    }
}
exports.ObservableSocket = ObservableSocket;
