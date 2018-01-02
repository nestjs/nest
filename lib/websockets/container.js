"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SocketsContainer {
    constructor() {
        this.observableServers = new Map();
    }
    getAllServers() {
        return this.observableServers;
    }
    getServerByPort(port) {
        return this.observableServers.get(`${port}`);
    }
    addServer(namespace, port, server) {
        this.observableServers.set(namespace ? `${namespace}:${port}` : `${port}`, server);
    }
    clear() {
        this.observableServers.clear();
    }
}
exports.SocketsContainer = SocketsContainer;
