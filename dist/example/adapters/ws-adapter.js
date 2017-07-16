"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
class WsAdapter {
    create(port) {
        return new WebSocket.Server({ port });
    }
    bindClientConnect(server, callback) {
        server.on('connection', callback);
    }
    bindMessageHandlers(client, handlers) {
        client.on('message', (buffer) => {
            const data = JSON.parse(buffer);
            const { type } = data;
            const messageHandler = handlers.find((handler) => handler.message === type);
            messageHandler && messageHandler.callback(data);
        });
    }
}
//# sourceMappingURL=ws-adapter.js.map