"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const invalid_socket_port_exception_1 = require("./exceptions/invalid-socket-port.exception");
const gateway_metadata_explorer_1 = require("./gateway-metadata-explorer");
const constants_1 = require("./constants");
const metadata_scanner_1 = require("@nestjs/core/metadata-scanner");
const middlewares_injector_1 = require("./middlewares-injector");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const fromPromise_1 = require("rxjs/observable/fromPromise");
const of_1 = require("rxjs/observable/of");
const operators_1 = require("rxjs/operators");
class WebSocketsController {
    constructor(socketServerProvider, container, config, contextCreator) {
        this.socketServerProvider = socketServerProvider;
        this.container = container;
        this.config = config;
        this.contextCreator = contextCreator;
        this.metadataExplorer = new gateway_metadata_explorer_1.GatewayMetadataExplorer(new metadata_scanner_1.MetadataScanner());
        this.middlewaresInjector = new middlewares_injector_1.MiddlewaresInjector(container, config);
    }
    hookGatewayIntoServer(instance, metatype, module) {
        const namespace = Reflect.getMetadata(constants_1.NAMESPACE_METADATA, metatype) || '';
        const port = Reflect.getMetadata(constants_1.PORT_METADATA, metatype) || 0;
        if (!Number.isInteger(port)) {
            throw new invalid_socket_port_exception_1.InvalidSocketPortException(port, metatype);
        }
        this.subscribeObservableServer(instance, namespace, port, module);
    }
    subscribeObservableServer(instance, namespace, port, module) {
        const plainMessageHandlers = this.metadataExplorer.explore(instance);
        const messageHandlers = plainMessageHandlers.map(({ callback, message }) => ({
            message,
            callback: this.contextCreator.create(instance, callback, module),
        }));
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
        this.subscribeConnectionEvent(instance, connection);
        this.subscribeDisconnectEvent(instance, disconnect);
        init.next(server);
        const handler = this.getConnectionHandler(this, instance, messageHandlers, disconnect, connection);
        adapter.bindClientConnect(server, handler);
    }
    getConnectionHandler(context, instance, messageHandlers, disconnect, connection) {
        const adapter = this.config.getIoAdapter();
        return client => {
            connection.next(client);
            context.subscribeMessages(messageHandlers, client, instance);
            const disconnectHook = adapter.bindClientDisconnect;
            disconnectHook &&
                disconnectHook.call(adapter, client, socket => disconnect.next(client));
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
        adapter.bindMessageHandlers(client, handlers, data => fromPromise_1.fromPromise(this.pickResult(data)).pipe(operators_1.switchMap(stream => stream)));
    }
    pickResult(defferedResult) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield defferedResult;
            if (result && shared_utils_1.isFunction(result.subscribe)) {
                return result;
            }
            if (result instanceof Promise) {
                return fromPromise_1.fromPromise(result);
            }
            return of_1.of(result);
        });
    }
    hookServerToProperties(instance, server) {
        for (const propertyKey of this.metadataExplorer.scanForServerHooks(instance)) {
            Reflect.set(instance, propertyKey, server);
        }
    }
}
exports.WebSocketsController = WebSocketsController;
