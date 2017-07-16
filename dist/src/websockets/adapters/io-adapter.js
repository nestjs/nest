"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io = require("socket.io");
const constants_1 = require("./../constants");
class IoAdapter {
    static create(port) {
        return io(port);
    }
    static createWithNamespace(port, namespace) {
        return io(port).of(namespace);
    }
    static bindClientConnect(server, callback) {
        server.on(constants_1.CONNECTION_EVENT, callback);
    }
    static bindClientDisconnect(client, callback) {
        client.on(constants_1.DISCONNECT_EVENT, callback);
    }
    static bindMessageHandlers(client, handlers) {
        handlers.forEach((handler) => {
            const { message, callback } = handler;
            client.on(message, callback);
        });
    }
    static bindMiddleware(server, middleware) {
        server.use(middleware);
    }
}
exports.IoAdapter = IoAdapter;
//# sourceMappingURL=io-adapter.js.map