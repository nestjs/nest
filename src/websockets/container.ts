import {ObservableSocketServer, WebSocketServerData} from './interfaces';

export class SocketsContainer {
  private readonly observableServers =
      new Map<string, ObservableSocketServer>();

  public getAllServers(): Map<string, ObservableSocketServer> {
    return this.observableServers;
  }

  public getServer(namespace: string, port: number): ObservableSocketServer {
    return this.observableServers.get(`${namespace}:${port}`);
  }

  public addServer(namespace: string, port: number,
                   server: ObservableSocketServer) {
    this.observableServers.set(`${namespace}:${port}`, server);
  }

  public clear() { this.observableServers.clear(); }
}
