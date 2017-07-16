"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SocketsContainer {
    constructor() {
        this.observableServers = new Map();
    }
    getAllServers() {
        return this.observableServers;
    }
    getServer(namespace, port) {
        return this.observableServers.get({
            namespace,
            port,
        });
    }
    addServer(namespace, port, server) {
        this.observableServers.set({
            namespace,
            port,
        }, server);
    }
    clear() {
        this.observableServers.clear();
    }
}
exports.SocketsContainer = SocketsContainer;
//# sourceMappingURL=container.js.map