import 'reflect-metadata';
import { NestGateway } from './interfaces/nest-gateway.interface';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { ObservableSocketServer } from './interfaces/observable-socket-server.interface';
import { InvalidSocketPortException } from './exceptions/invalid-socket-port.exception';
import { GatewayMetadataExplorer, MessageMappingProperties } from './gateway-metadata-explorer';
import { Subject } from 'rxjs/Subject';
import { SocketServerProvider } from './socket-server-provider';
import { NAMESPACE_METADATA, PORT_METADATA } from './constants';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { NestContainer } from '@nestjs/core/injector/container';
import { MiddlewaresInjector } from './middlewares-injector';
import { ApplicationConfig } from '@nestjs/core/application-config';

export class WebSocketsController {
    private readonly metadataExplorer = new GatewayMetadataExplorer(new MetadataScanner());
    private readonly middlewaresInjector: MiddlewaresInjector;

    constructor(
        private readonly socketServerProvider: SocketServerProvider,
        private readonly container: NestContainer,
        private readonly config: ApplicationConfig) {
            this.middlewaresInjector = new MiddlewaresInjector(container, config);
        }

    public hookGatewayIntoServer(instance: NestGateway, metatype: Metatype<Injectable>, module: string) {
        const namespace = Reflect.getMetadata(NAMESPACE_METADATA, metatype) || '';
        const port = Reflect.getMetadata(PORT_METADATA, metatype) || 80;

        if (!Number.isInteger(port)) {
            throw new InvalidSocketPortException(port, metatype);
        }
        this.subscribeObservableServer(instance, namespace, port, module);
    }

    public subscribeObservableServer(instance: NestGateway, namespace: string, port: number, module: string) {
        const messageHandlers = this.metadataExplorer.explore(instance);
        const observableServer = this.socketServerProvider.scanForSocketServer(namespace, port);

        this.injectMiddlewares(observableServer, instance, module);
        this.hookServerToProperties(instance, observableServer.server);
        this.subscribeEvents(instance, messageHandlers, observableServer);
    }

    public injectMiddlewares({ server }, instance: NestGateway, module: string) {
        this.middlewaresInjector.inject(server, instance, module);
    }

    public subscribeEvents(
        instance: NestGateway,
        messageHandlers: MessageMappingProperties[],
        observableServer: ObservableSocketServer) {

        const { init, disconnect, connection, server } = observableServer;
        const adapter = this.config.getIoAdapter();

        this.subscribeInitEvent(instance, init);
        init.next(server);

        const handler = this.getConnectionHandler(this, instance, messageHandlers, disconnect, connection);
        adapter.bindClientConnect(server, handler);
    }

    public getConnectionHandler(
        context: WebSocketsController,
        instance: NestGateway,
        messageHandlers: MessageMappingProperties[],
        disconnect: Subject<any>,
        connection: Subject<any>) {

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

    public subscribeInitEvent(instance: NestGateway, event: Subject<any>) {
        if (instance.afterInit) {
            event.subscribe(instance.afterInit.bind(instance));
        }
    }

    public subscribeConnectionEvent(instance: NestGateway, event: Subject<any>) {
        if (instance.handleConnection) {
            event.subscribe(instance.handleConnection.bind(instance));
        }
    }

    public subscribeDisconnectEvent(instance: NestGateway, event: Subject<any>) {
        if (instance.handleDisconnect) {
            event.subscribe(instance.handleDisconnect.bind(instance));
        }
    }

    public subscribeMessages(messageHandlers: MessageMappingProperties[], client, instance: NestGateway) {
        const adapter = this.config.getIoAdapter();
        const handlers = messageHandlers.map(({ callback, message }) => ({
            message,
            callback: callback.bind(instance, client),
        }));
        adapter.bindMessageHandlers(client, handlers);
    }

    private hookServerToProperties(instance: NestGateway, server) {
        for (const propertyKey of this.metadataExplorer.scanForServerHooks(instance)) {
            Reflect.set(instance, propertyKey, server);
        }
    }
}