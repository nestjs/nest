import { ObservableSocketServer } from './interfaces';
export declare class SocketsContainer {
    private readonly observableServers;
    getAllServers(): Map<string, ObservableSocketServer>;
    getServerByPort(port: number): ObservableSocketServer;
    addServer(namespace: string, port: number, server: ObservableSocketServer): void;
    clear(): void;
}
