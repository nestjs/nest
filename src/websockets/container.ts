import { WebSocketServerData, ObservableSocketServer } from './interfaces';

export class SocketsContainer {
    private readonly observableServers = new Map<WebSocketServerData, ObservableSocketServer>();

    public getServer(namespace: string, port: number): ObservableSocketServer {
        return this.observableServers.get({
            namespace,
            port,
        });
    }

    public addServer(namespace: string, port: number, server: ObservableSocketServer) {
        this.observableServers.set({
            namespace,
            port,
        }, server);
    }
}
