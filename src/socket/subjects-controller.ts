import "reflect-metadata";
import { Gateway } from "./interfaces/gateway.interface";
import { Injectable } from "../common/interfaces/injectable.interface";
import { ObservableSocketServer } from "./interfaces/observable-socket-server.interface";
import { InvalidSocketPortException } from "./exceptions/invalid-socket-port.exception";
import { GatewayMetadataExplorer, MessageMappingProperties } from "./gateway-metadata-explorer";
import { Subject } from "rxjs";
import { SocketServerProvider } from "./socket-server-provider";

export class SubjectsController {

    constructor(
        private socketServerProvider: SocketServerProvider) {}

    hookGatewayIntoServer(instance: Gateway, componentType: Injectable) {
        const namespace = Reflect.getMetadata("namespace", componentType) || "";
        const port = Reflect.getMetadata("port", componentType) || 80;

        if (!Number.isInteger(port)) {
            throw new InvalidSocketPortException(port, componentType);
        }
        this.subscribeObservableServer(instance, namespace, port);
    }

    private subscribeObservableServer(instance: Gateway, namespace: string, port: number) {
        const messageHandlers = GatewayMetadataExplorer.explore(instance);
        const observableServer = this.socketServerProvider.scanForSocketServer(namespace, port);

        this.hookServerToProperties(instance, observableServer.server);
        this.subscribeEvents(instance, messageHandlers, observableServer);
    }

    private hookServerToProperties(instance: Gateway, server) {
        for (const propertyKey of GatewayMetadataExplorer.scanForServerHooks(instance)) {
            Reflect.set(instance, propertyKey, server);
        }
    }

    private subscribeEvents(
        instance: Gateway,
        messageHandlers: MessageMappingProperties[],
        observableServer: ObservableSocketServer) {

        const {
            init,
            disconnect,
            connection,
            server
        } = observableServer;

        this.subscribeInitEvent(instance, init);
        init.next(server);

        server.on("connection", (client) => {
            this.subscribeConnectionEvent(instance, connection);
            connection.next(client);

            this.subscribeMessages(messageHandlers, client, instance);
            this.subscribeDisconnectEvent(instance, disconnect);
            client.on("disconnect", (client) => disconnect.next(client));
        });
    }

    private subscribeInitEvent(instance: Gateway, event: Subject<any>) {
        if (instance.afterInit) {
            event.subscribe(instance.afterInit.bind(instance));
        }
    }

    private subscribeConnectionEvent(instance: Gateway, event: Subject<any>) {
        if (instance.handleConnection) {
            event.subscribe(instance.handleConnection.bind(instance));
        }
    }

    private subscribeDisconnectEvent(instance: Gateway, event: Subject<any>) {
        if (instance.handleDisconnect) {
            event.subscribe(instance.handleDisconnect.bind(instance));
        }
    }

    private subscribeMessages(messageHandlers: MessageMappingProperties[], client, instance: Gateway) {
        messageHandlers.map(({ message, targetCallback }) => {
            client.on(
                message,
                targetCallback.bind(instance, client),
            );
        });
    }

}