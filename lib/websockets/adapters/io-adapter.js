"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io = require("socket.io");
const constants_1 = require("../constants");
const Observable_1 = require("rxjs/Observable");
require("rxjs/add/observable/fromEvent");
require("rxjs/add/operator/switchMap");
require("rxjs/add/operator/filter");
require("rxjs/add/operator/do");
class IoAdapter {
    constructor(httpServer = null) {
        this.httpServer = httpServer;
    }
    create(port) {
        return this.createIOServer(port);
    }
    createWithNamespace(port, namespace, server) {
        return server
            ? server.of(namespace)
            : this.createIOServer(port).of(namespace);
    }
    createIOServer(port) {
        if (this.httpServer && port === 0) {
            return io.listen(this.httpServer);
        }
        return io(port);
    }
    bindClientConnect(server, callback) {
        server.on(constants_1.CONNECTION_EVENT, callback);
    }
    bindClientDisconnect(client, callback) {
        client.on(constants_1.DISCONNECT_EVENT, callback);
    }
    bindMessageHandlers(client, handlers, process) {
        handlers.forEach(({ message, callback }) => Observable_1.Observable.fromEvent(client, message)
            .switchMap(data => process(callback(data)))
            .filter(result => !!result && result.event)
            .subscribe(({ event, data }) => client.emit(event, data)));
    }
    bindMiddleware(server, middleware) {
        server.use(middleware);
    }
}
exports.IoAdapter = IoAdapter;
