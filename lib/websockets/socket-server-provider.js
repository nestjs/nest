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
        const observableServer = this.socketsContainer.getServer(namespace, port);
        return observableServer ? observableServer : this.createSocketServer(namespace, port);
    }
    createSocketServer(namespace, port) {
        const server = this.getServerOfNamespace(namespace, port);
        const observableSocket = observable_socket_1.ObservableSocket.create(server);
        this.socketsContainer.addServer(namespace, port, observableSocket);
        return observableSocket;
    }
    getServerOfNamespace(namespace, port) {
        const adapter = this.applicationConfig.getIoAdapter();
        if (namespace && adapter.createWithNamespace) {
            return adapter.createWithNamespace(port, this.validateNamespace(namespace));
        }
        return adapter.create(port);
    }
    validateNamespace(namespace) {
        return shared_utils_1.validatePath(namespace);
    }
}
exports.SocketServerProvider = SocketServerProvider;
