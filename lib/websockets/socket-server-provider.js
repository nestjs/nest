"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const observable_socket_1 = require("./observable-socket");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
class SocketServerProvider {
    constructor(socketsContainer, applicationConfig) {
        this.socketsContainer = socketsContainer;
        this.applicationConfig = applicationConfig;
    }
    scanForSocketServer(namespace, port) {
        const observableServer = this.socketsContainer.getServerByPort(port);
        return observableServer
            ? this.createWithNamespace(namespace, port, observableServer)
            : this.createSocketServer(namespace, port);
    }
    createSocketServer(namespace, port) {
        const adapter = this.applicationConfig.getIoAdapter();
        const server = adapter.create(port);
        const observableSocket = observable_socket_1.ObservableSocket.create(server);
        this.socketsContainer.addServer(null, port, observableSocket);
        return this.createWithNamespace(namespace, port, observableSocket);
    }
    createWithNamespace(namespace, port, observableSocket) {
        const adapter = this.applicationConfig.getIoAdapter();
        if (!namespace || !adapter.createWithNamespace) {
            return observableSocket;
        }
        const namespaceServer = this.getServerOfNamespace(namespace, port, observableSocket.server);
        const observableNamespaceSocket = observable_socket_1.ObservableSocket.create(namespaceServer);
        this.socketsContainer.addServer(namespace, port, observableNamespaceSocket);
        return observableNamespaceSocket;
    }
    getServerOfNamespace(namespace, port, server) {
        const adapter = this.applicationConfig.getIoAdapter();
        return adapter.createWithNamespace(port, this.validateNamespace(namespace), server);
    }
    validateNamespace(namespace) {
        return shared_utils_1.validatePath(namespace);
    }
}
exports.SocketServerProvider = SocketServerProvider;
