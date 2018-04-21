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
const observable_socket_1 = require("./observable-socket");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
class SocketServerProvider {
    constructor(socketsContainer, applicationConfig) {
        this.socketsContainer = socketsContainer;
        this.applicationConfig = applicationConfig;
    }
    scanForSocketServer(options, port) {
        const observableServer = this.socketsContainer.getServerByPort(port);
        return observableServer
            ? this.createWithNamespace(options, port, observableServer)
            : this.createSocketServer(options, port);
    }
    createSocketServer(options, port) {
        const { namespace, server } = options, opt = __rest(options, ["namespace", "server"]);
        const adapter = this.applicationConfig.getIoAdapter();
        const ioServer = adapter.create(port, opt);
        const observableSocket = observable_socket_1.ObservableSocket.create(ioServer);
        this.socketsContainer.addServer(null, port, observableSocket);
        return this.createWithNamespace(options, port, observableSocket);
    }
    createWithNamespace(options, port, observableSocket) {
        const { namespace } = options;
        if (!namespace) {
            return observableSocket;
        }
        const namespaceServer = this.getServerOfNamespace(options, port, observableSocket.server);
        const observableNamespaceSocket = observable_socket_1.ObservableSocket.create(namespaceServer);
        this.socketsContainer.addServer(namespace, port, observableNamespaceSocket);
        return observableNamespaceSocket;
    }
    getServerOfNamespace(options, port, server) {
        const adapter = this.applicationConfig.getIoAdapter();
        return adapter.create(port, Object.assign({}, options, { namespace: this.validateNamespace(options.namespace || ''), server }));
    }
    validateNamespace(namespace) {
        return shared_utils_1.validatePath(namespace);
    }
}
exports.SocketServerProvider = SocketServerProvider;
