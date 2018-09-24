import { ObservableSocketServer } from './interfaces';

export class SocketsContainer {
  private readonly observableServers = new Map<
    string,
    ObservableSocketServer
  >();

  public getAllServers(): Map<string, ObservableSocketServer> {
    return this.observableServers;
  }

  public getServerByPort(port: number): ObservableSocketServer {
    return this.observableServers.get(`${port}`);
  }

  public addServer(
    namespace: string,
    port: number,
    server: ObservableSocketServer,
  ) {
    this.observableServers.set(
      namespace ? `${namespace}:${port}` : `${port}`,
      server,
    );
  }

  public clear() {
    this.observableServers.clear();
  }
}
