"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const io = require("socket.io");
const constants_1 = require("../constants");
class IoAdapter {
    constructor(httpServer = null) {
        this.httpServer = httpServer;
    }
    create(port, options) {
        if (!options) {
            return this.createIOServer(port);
        }
        const { namespace, server } = options, opt = __rest(options, ["namespace", "server"]);
        return server && shared_utils_1.isFunction(server.of)
            ? server.of(namespace)
            : namespace
                ? this.createIOServer(port, opt).of(namespace)
                : this.createIOServer(port, opt);
    }
    createIOServer(port, options) {
        if (this.httpServer && port === 0) {
            return io(this.httpServer, options);
        }
        return io(port, options);
    }
    bindClientConnect(server, callback) {
        server.on(constants_1.CONNECTION_EVENT, callback);
    }
    bindClientDisconnect(client, callback) {
        client.on(constants_1.DISCONNECT_EVENT, callback);
    }
    bindMessageHandlers(client, handlers, transform) {
        handlers.forEach(({ message, callback }) => rxjs_1.fromEvent(client, message)
            .pipe(operators_1.mergeMap(data => transform(callback(data))), operators_1.filter(result => !!result && result.event))
            .subscribe(({ event, data }) => client.emit(event, data)));
    }
    bindMiddleware(server, middleware) {
        server.use(middleware);
    }
    close(server) {
        shared_utils_1.isFunction(server.close) && server.close();
    }
}
exports.IoAdapter = IoAdapter;
