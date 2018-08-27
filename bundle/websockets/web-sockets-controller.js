"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const metadata_scanner_1 = require("@nestjs/core/metadata-scanner");
require("reflect-metadata");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const constants_1 = require("./constants");
const invalid_socket_port_exception_1 = require("./exceptions/invalid-socket-port.exception");
const gateway_metadata_explorer_1 = require("./gateway-metadata-explorer");
const middleware_injector_1 = require("./middleware-injector");
class WebSocketsController {
    constructor(socketServerProvider, container, config, contextCreator) {
        this.socketServerProvider = socketServerProvider;
        this.container = container;
        this.config = config;
        this.contextCreator = contextCreator;
        this.metadataExplorer = new gateway_metadata_explorer_1.GatewayMetadataExplorer(new metadata_scanner_1.MetadataScanner());
        this.middlewareInjector = new middleware_injector_1.MiddlewareInjector(container, config);
    }
    hookGatewayIntoServer(instance, metatype, module) {
        const options = Reflect.getMetadata(constants_1.GATEWAY_OPTIONS, metatype) || {};
        const port = Reflect.getMetadata(constants_1.PORT_METADATA, metatype) || 0;
        if (!Number.isInteger(port)) {
            throw new invalid_socket_port_exception_1.InvalidSocketPortException(port, metatype);
        }
        this.subscribeObservableServer(instance, options, port, module);
    }
    subscribeObservableServer(instance, options, port, module) {
        const plainMessageHandlers = this.metadataExplorer.explore(instance);
        const messageHandlers = plainMessageHandlers.map(({ callback, message }) => ({
            message,
            callback: this.contextCreator.create(instance, callback, module),
        }));
        const observableServer = this.socketServerProvider.scanForSocketServer(options, port);
        this.injectMiddleware(observableServer, instance, module);
        this.hookServerToProperties(instance, observableServer.server);
        this.subscribeEvents(instance, messageHandlers, observableServer);
    }
    injectMiddleware({ server }, instance, module) {
        this.middlewareInjector.inject(server, instance, module);
    }
    subscribeEvents(instance, messageHandlers, observableServer) {
        const { init, disconnect, connection, server } = observableServer;
        const adapter = this.config.getIoAdapter();
        this.subscribeInitEvent(instance, init);
        this.subscribeConnectionEvent(instance, connection);
        this.subscribeDisconnectEvent(instance, disconnect);
        const handler = this.getConnectionHandler(this, instance, messageHandlers, disconnect, connection);
        adapter.bindClientConnect(server, handler);
    }
    getConnectionHandler(context, instance, messageHandlers, disconnect, connection) {
        const adapter = this.config.getIoAdapter();
        return (...args) => {
            const [client] = args;
            connection.next(args);
            context.subscribeMessages(messageHandlers, client, instance);
            const disconnectHook = adapter.bindClientDisconnect;
            disconnectHook &&
                disconnectHook.call(adapter, client, _ => disconnect.next(client));
        };
    }
    subscribeInitEvent(instance, event) {
        if (instance.afterInit) {
            event.subscribe(instance.afterInit.bind(instance));
        }
    }
    subscribeConnectionEvent(instance, event) {
        if (instance.handleConnection) {
            event
                .pipe(operators_1.distinctUntilChanged())
                .subscribe((args) => instance.handleConnection(...args));
        }
    }
    subscribeDisconnectEvent(instance, event) {
        if (instance.handleDisconnect) {
            event
                .pipe(operators_1.distinctUntilChanged())
                .subscribe(instance.handleDisconnect.bind(instance));
        }
    }
    subscribeMessages(messageHandlers, client, instance) {
        const adapter = this.config.getIoAdapter();
        const handlers = messageHandlers.map(({ callback, message }) => ({
            message,
            callback: callback.bind(instance, client),
        }));
        adapter.bindMessageHandlers(client, handlers, data => rxjs_1.from(this.pickResult(data)).pipe(operators_1.mergeAll()));
    }
    async pickResult(defferedResult) {
        const result = await defferedResult;
        if (result && shared_utils_1.isFunction(result.subscribe)) {
            return result;
        }
        if (result instanceof Promise) {
            return rxjs_1.from(result);
        }
        return rxjs_1.of(result);
    }
    hookServerToProperties(instance, server) {
        for (const propertyKey of this.metadataExplorer.scanForServerHooks(instance)) {
            Reflect.set(instance, propertyKey, server);
        }
    }
}
exports.WebSocketsController = WebSocketsController;
