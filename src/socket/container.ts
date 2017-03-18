import { SocketServerData, ObservableSocketServer } from './interfaces';

export class SocketsContainer {
    private readonly socketSubjects = new Map<SocketServerData, ObservableSocketServer>();

    getSocketSubjects(namespace: string, port: number): ObservableSocketServer {
        return this.socketSubjects.get({
            namespace,
            port
        });
    }

    storeSocketSubjects(namespace: string, port: number, server: ObservableSocketServer) {
        this.socketSubjects.set({
            namespace,
            port
        }, server);
    }

}
