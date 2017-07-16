"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const invalid_socket_port_exception_1 = require("./exceptions/invalid-socket-port.exception");
const gateway_metadata_explorer_1 = require("./gateway-metadata-explorer");
const constants_1 = require("./constants");
const metadata_scanner_1 = require("@nestjs/core/metadata-scanner");
const middlewares_injector_1 = require("./middlewares-injector");
class WebSocketsController {
    constructor(socketServerProvider, container, config) {
        this.socketServerProvider = socketServerProvider;
        this.container = container;
        this.config = config;
        this.metadataExplorer = new gateway_metadata_explorer_1.GatewayMetadataExplorer(new metadata_scanner_1.MetadataScanner());
        this.middlewaresInjector = new middlewares_injector_1.MiddlewaresInjector(container, config);
    }
    hookGatewayIntoServer(instance, metatype, module) {
        const namespace = Reflect.getMetadata(constants_1.NAMESPACE_METADATA, metatype) || '';
        const port = Reflect.getMetadata(constants_1.PORT_METADATA, metatype) || 80;
        if (!Number.isInteger(port)) {
            throw new invalid_socket_port_exception_1.InvalidSocketPortException(port, metatype);
        }
        this.subscribeObservableServer(instance, namespace, port, module);
    }
    subscribeObservableServer(instance, namespace, port, module) {
        const messageHandlers = this.metadataExplorer.explore(instance);
        const observableServer = this.socketServerProvider.scanForSocketServer(namespace, port);
        this.injectMiddlewares(observableServer, instance, module);
        this.hookServerToProperties(instance, observableServer.server);
        this.subscribeEvents(instance, messageHandlers, observableServer);
    }
    injectMiddlewares({ server }, instance, module) {
        this.middlewaresInjector.inject(server, instance, module);
    }
    subscribeEvents(instance, messageHandlers, observableServer) {
        const { init, disconnect, connection, server } = observableServer;
        const adapter = this.config.getIoAdapter();
        this.subscribeInitEvent(instance, init);
        init.next(server);
        const handler = this.getConnectionHandler(this, instance, messageHandlers, disconnect, connection);
        adapter.bindClientConnect(server, handler);
    }
    getConnectionHandler(context, instance, messageHandlers, disconnect, connection) {
        const adapter = this.config.getIoAdapter();
        return (client) => {
            context.subscribeConnectionEvent(instance, connection);
            connection.next(client);
            context.subscribeMessages(messageHandlers, client, instance);
            context.subscribeDisconnectEvent(instance, disconnect);
            const disconnectHook = adapter.bindClientDisconnect;
            disconnectHook && disconnectHook(client, socket => disconnect.next(socket));
        };
    }
    subscribeInitEvent(instance, event) {
        if (instance.afterInit) {
            event.subscribe(instance.afterInit.bind(instance));
        }
    }
    subscribeConnectionEvent(instance, event) {
        if (instance.handleConnection) {
            event.subscribe(instance.handleConnection.bind(instance));
        }
    }
    subscribeDisconnectEvent(instance, event) {
        if (instance.handleDisconnect) {
            event.subscribe(instance.handleDisconnect.bind(instance));
        }
    }
    subscribeMessages(messageHandlers, client, instance) {
        const adapter = this.config.getIoAdapter();
        const handlers = messageHandlers.map(({ callback, message }) => ({
            message,
            callback: callback.bind(instance, client),
        }));
        adapter.bindMessageHandlers(client, handlers);
    }
    hookServerToProperties(instance, server) {
        for (const propertyKey of this.metadataExplorer.scanForServerHooks(instance)) {
            Reflect.set(instance, propertyKey, server);
        }
    }
}
exports.WebSocketsController = WebSocketsController;
//# sourceMappingURL=web-sockets-controller.js.map