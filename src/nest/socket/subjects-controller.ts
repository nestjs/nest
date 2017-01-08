import "reflect-metadata";
import { Subject, ReplaySubject } from "rxjs";
import { Component } from "../core/interfaces";
import { Gateway } from "./interfaces/gateway.interface";
import { SocketsContainer, SocketEvents } from "./sockets-container";

export class SubjectsController {

    constructor(
        private socketsContainer: SocketsContainer,
        private IOServer) {}

    hookGatewayIntoSocket(instance: Gateway, componentType: Component) {
        const namespace = Reflect.getMetadata("namespace", componentType) || "";
        const observableServer = this.scanForSocketServer(namespace);

        const { init, connection } = observableServer;
        init.subscribe(instance.onInit.bind(instance));
        connection.subscribe(instance.connection.bind(instance));
    }

    private scanForSocketServer(namespace: string): SocketEvents {
        let observableServer: SocketEvents = this.socketsContainer.getSocketSubjects(namespace);

        if (!observableServer) {
            observableServer = this.createSocketServer(namespace);
        }
        return observableServer;
    }

    private createSocketServer(namespace: string) {
        const server = this.getServerOfNamespace(namespace);
        const observableServer = {
            server,
            init: new ReplaySubject(),
            connection: new Subject(),
        };

        const { init, connection } = observableServer;
        init.next(server);

        server.on("connection", (client) => {
            connection.next(client);
        });

        this.socketsContainer.storeSocketSubjects(namespace, observableServer);
        return observableServer;
    }

    private getServerOfNamespace(namespace: string) {
        if (namespace) {
            return this.IOServer.of(this.validateNamespace(namespace));
        }
        return this.IOServer;
    }

    private validateNamespace(namespace: string) {
        if(namespace.charAt(0) !== '/') {
            return '/' + namespace;
        }
        return namespace;
    }

}