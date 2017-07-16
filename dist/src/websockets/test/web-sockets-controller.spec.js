"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const socket_server_provider_1 = require("../socket-server-provider");
const web_sockets_controller_1 = require("../web-sockets-controller");
const socket_gateway_decorator_1 = require("../utils/socket-gateway.decorator");
const invalid_socket_port_exception_1 = require("../exceptions/invalid-socket-port.exception");
const gateway_metadata_explorer_1 = require("../gateway-metadata-explorer");
const metadata_scanner_1 = require("../../core/metadata-scanner");
const application_config_1 = require("@nestjs/core/application-config");
describe('WebSocketsController', () => {
    let instance;
    let provider, config, mockProvider;
    const port = 90, namespace = '/';
    let Test = class Test {
    };
    Test = __decorate([
        socket_gateway_decorator_1.WebSocketGateway({ port, namespace })
    ], Test);
    beforeEach(() => {
        config = new application_config_1.ApplicationConfig();
        provider = new socket_server_provider_1.SocketServerProvider(null, config);
        mockProvider = sinon.mock(provider);
        instance = new web_sockets_controller_1.WebSocketsController(provider, null, config);
    });
    describe('hookGatewayIntoServer', () => {
        let subscribeObservableServer;
        let InvalidGateway = class InvalidGateway {
        };
        InvalidGateway = __decorate([
            socket_gateway_decorator_1.WebSocketGateway({ port: 'test' })
        ], InvalidGateway);
        let DefaultGateway = class DefaultGateway {
        };
        DefaultGateway = __decorate([
            socket_gateway_decorator_1.WebSocketGateway()
        ], DefaultGateway);
        beforeEach(() => {
            subscribeObservableServer = sinon.spy();
            instance.subscribeObservableServer = subscribeObservableServer;
        });
        it('should throws "InvalidSocketPortException" when port is not a number', () => {
            chai_1.expect(() => instance.hookGatewayIntoServer(new InvalidGateway(), InvalidGateway, '')).throws(invalid_socket_port_exception_1.InvalidSocketPortException);
        });
        it('should call "subscribeObservableServer" with default values when metadata is empty', () => {
            const gateway = new DefaultGateway();
            instance.hookGatewayIntoServer(gateway, DefaultGateway, '');
            chai_1.expect(subscribeObservableServer.calledWith(gateway, '', 80)).to.be.true;
        });
        it('should call "subscribeObservableServer" when metadata is valid', () => {
            const gateway = new Test();
            instance.hookGatewayIntoServer(gateway, Test, '');
            chai_1.expect(subscribeObservableServer.calledWith(gateway, namespace, port)).to.be.true;
        });
    });
    describe('subscribeObservableServer', () => {
        let explorer, mockExplorer, gateway, handlers, server, hookServerToProperties, subscribeEvents;
        beforeEach(() => {
            gateway = new Test();
            explorer = new gateway_metadata_explorer_1.GatewayMetadataExplorer(new metadata_scanner_1.MetadataScanner());
            mockExplorer = sinon.mock(explorer);
            instance.metadataExplorer = explorer;
            handlers = ['test'];
            server = { server: 'test' };
            mockExplorer.expects('explore').returns(handlers);
            mockProvider.expects('scanForSocketServer').returns(server);
            hookServerToProperties = sinon.spy();
            subscribeEvents = sinon.spy();
            instance.hookServerToProperties = hookServerToProperties;
            instance.subscribeEvents = subscribeEvents;
            sinon.stub(instance, 'injectMiddlewares').returns(0);
        });
        it('should call "hookServerToProperties" with expected arguments', () => {
            instance.subscribeObservableServer(gateway, namespace, port, '');
            chai_1.expect(hookServerToProperties.calledWith(gateway, server.server));
        });
        it('should call "subscribeEvents" with expected arguments', () => {
            instance.subscribeObservableServer(gateway, namespace, port, '');
            chai_1.expect(subscribeEvents.calledWith(gateway, handlers, server));
        });
    });
    describe('subscribeEvents', () => {
        const gateway = new Test();
        let handlers;
        let server, nextSpy, onSpy, subscribeInitEvent, getConnectionHandler;
        beforeEach(() => {
            nextSpy = sinon.spy();
            onSpy = sinon.spy();
            subscribeInitEvent = sinon.spy();
            getConnectionHandler = sinon.spy();
            handlers = ['test'];
            server = {
                init: {
                    next: nextSpy,
                },
                server: {
                    on: onSpy,
                    disconnect: {},
                    connection: {},
                },
            };
            instance.subscribeInitEvent = subscribeInitEvent;
            instance.getConnectionHandler = getConnectionHandler;
        });
        it('should call "next" method of server object with expected argument', () => {
            instance.subscribeEvents(gateway, handlers, server);
            chai_1.expect(nextSpy.calledWith(server.server)).to.be.true;
        });
        it('should call "subscribeInitEvent" with expected arguments', () => {
            instance.subscribeEvents(gateway, handlers, server);
            chai_1.expect(subscribeInitEvent.calledWith(gateway, server.init)).to.be.true;
        });
        it('should bind connection handler to server', () => {
            instance.subscribeEvents(gateway, handlers, server);
            chai_1.expect(onSpy.calledWith('connection', getConnectionHandler())).to.be.true;
        });
        it('should call "getConnectionHandler" with expected arguments', () => {
            instance.subscribeEvents(gateway, handlers, server);
            chai_1.expect(getConnectionHandler.calledWith(instance, gateway, handlers, server.disconnect, server.connection)).to.be.true;
        });
    });
    describe('getConnectionHandler', () => {
        const gateway = new Test();
        let handlers, fn;
        let connection, client, nextSpy, onSpy, subscribeMessages, subscribeDisconnectEvent, subscribeConnectionEvent;
        beforeEach(() => {
            nextSpy = sinon.spy();
            onSpy = sinon.spy();
            subscribeMessages = sinon.spy();
            subscribeDisconnectEvent = sinon.spy();
            subscribeConnectionEvent = sinon.spy();
            handlers = ['test'];
            connection = {
                next: nextSpy,
            };
            client = {
                on: onSpy,
            };
            instance.subscribeDisconnectEvent = subscribeDisconnectEvent;
            instance.subscribeConnectionEvent = subscribeConnectionEvent;
            instance.subscribeMessages = subscribeMessages;
            fn = instance.getConnectionHandler(instance, gateway, handlers, null, connection);
            fn(client);
        });
        it('should returns function', () => {
            chai_1.expect(instance.getConnectionHandler(null, null, null, null, null)).to.be.a('function');
        });
        it('should call "subscribeConnectionEvent" with expected arguments', () => {
            chai_1.expect(subscribeConnectionEvent.calledWith(gateway, connection)).to.be.true;
        });
        it('should call "next" method of connection object with expected argument', () => {
            chai_1.expect(nextSpy.calledWith(client)).to.be.true;
        });
        it('should call "subscribeMessages" with expected arguments', () => {
            chai_1.expect(subscribeMessages.calledWith(handlers, client, gateway)).to.be.true;
        });
        it('should call "subscribeDisconnectEvent" with expected arguments', () => {
            chai_1.expect(subscribeDisconnectEvent.calledWith(gateway, null)).to.be.true;
        });
        it('should call "on" method of client object with expected arguments', () => {
            chai_1.expect(onSpy.called).to.be.true;
        });
    });
    describe('subscribeInitEvent', () => {
        const gateway = new Test();
        let event, subscribe;
        beforeEach(() => {
            subscribe = sinon.spy();
            event = { subscribe };
        });
        it('should not call subscribe method when "afterInit" method not exists', () => {
            instance.subscribeInitEvent(gateway, event);
            chai_1.expect(subscribe.called).to.be.false;
        });
        it('should call subscribe method of event object with expected arguments when "afterInit" exists', () => {
            gateway.afterInit = () => { };
            instance.subscribeInitEvent(gateway, event);
            chai_1.expect(subscribe.called).to.be.true;
        });
    });
    describe('subscribeConnectionEvent', () => {
        const gateway = new Test();
        let event, subscribe;
        beforeEach(() => {
            subscribe = sinon.spy();
            event = { subscribe };
        });
        it('should not call subscribe method when "handleConnection" method not exists', () => {
            instance.subscribeConnectionEvent(gateway, event);
            chai_1.expect(subscribe.called).to.be.false;
        });
        it('should call subscribe method of event object with expected arguments when "handleConnection" exists', () => {
            gateway.handleConnection = () => { };
            instance.subscribeConnectionEvent(gateway, event);
            chai_1.expect(subscribe.called).to.be.true;
        });
    });
    describe('subscribeDisconnectEvent', () => {
        const gateway = new Test();
        let event, subscribe;
        beforeEach(() => {
            subscribe = sinon.spy();
            event = { subscribe };
        });
        it('should not call subscribe method when "handleDisconnect" method not exists', () => {
            instance.subscribeDisconnectEvent(gateway, event);
            chai_1.expect(subscribe.called).to.be.false;
        });
        it('should call subscribe method of event object with expected arguments when "handleDisconnect" exists', () => {
            gateway.handleDisconnect = () => { };
            instance.subscribeDisconnectEvent(gateway, event);
            chai_1.expect(subscribe.called).to.be.true;
        });
    });
    describe('subscribeMessages', () => {
        const gateway = new Test();
        let client, handlers, onSpy;
        beforeEach(() => {
            onSpy = sinon.spy();
            client = { on: onSpy };
            handlers = [
                { message: 'test', callback: { bind: () => 'testCallback' } },
                { message: 'test2', callback: { bind: () => 'testCallback2' } },
            ];
        });
        it('should bind each handler to client', () => {
            instance.subscribeMessages(handlers, client, gateway);
            chai_1.expect(onSpy.calledTwice).to.be.true;
            chai_1.expect(onSpy.calledWith('test', 'testCallback')).to.be.true;
            chai_1.expect(onSpy.calledWith('test2', 'testCallback2')).to.be.true;
        });
    });
});
//# sourceMappingURL=web-sockets-controller.spec.js.map