import 'reflect-metadata';
import { SocketsContainer } from './container';
import { ObservableSocket } from './observable-socket';
import { ObservableSocketServer } from './interfaces/observable-socket-server.interface';
import { IoAdapter } from './adapters/io-adapter';
import { validatePath } from '../common/utils/shared.utils';

export class SocketServerProvider {

    constructor(private readonly socketsContainer: SocketsContainer) {}

    public scanForSocketServer(namespace: string, port: number): ObservableSocketServer {
        const observableServer = this.socketsContainer.getSocketServer(namespace, port);
        return observableServer ? observableServer : this.createSocketServer(namespace, port);
    }

    private createSocketServer(namespace: string, port: number) {
        const server = this.getServerOfNamespace(namespace, port);
        const observableSocket = ObservableSocket.create(server);

        this.socketsContainer.storeObservableServer(namespace, port, observableSocket);
        return observableSocket;
    }

    private getServerOfNamespace(namespace: string, port: number) {
        if (namespace) {
            return IoAdapter.createWithNamespace(port, this.validateNamespace(namespace));
        }
        return IoAdapter.create(port);
    }

    private validateNamespace(namespace: string): string {
        return validatePath(namespace);
    }

}