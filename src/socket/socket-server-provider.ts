import "reflect-metadata";
import { SocketsContainer } from "./container";
import { ObservableSocket } from "./observable-socket";
import { ObservableSocketServer } from "./interfaces/observable-socket-server.interface";
import { IoAdapter } from "./adapters/io-adapter";

export class SocketServerProvider {

    constructor(private socketsContainer: SocketsContainer) {}

    public scanForSocketServer(namespace: string, port: number): ObservableSocketServer {
        let observableServer = this.socketsContainer.getSocketSubjects(namespace, port);

        if (!observableServer) {
            observableServer = this.createSocketServer(namespace, port);
        }
        return observableServer;
    }

    private createSocketServer(namespace: string, port: number) {
        const server = this.getServerOfNamespace(namespace, port);
        const observableSocket = ObservableSocket.create(server);

        this.socketsContainer.storeSocketSubjects(namespace, port, observableSocket);
        return observableSocket;
    }

    private getServerOfNamespace(namespace: string, port: number) {
        if (namespace) {
            return IoAdapter.createWithNamespace(port, this.validateNamespace(namespace));
        }
        return IoAdapter.create(port);
    }

    private validateNamespace(namespace: string): string {
        if(namespace.charAt(0) !== '/') {
            return '/' + namespace;
        }
        return namespace;
    }

}