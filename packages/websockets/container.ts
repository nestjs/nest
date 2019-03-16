import { ObservableSocketServer } from './interfaces';

export class SocketsContainer {
  private readonly observableServers = new Map<
    string | RegExp,
    ObservableSocketServer
  >();

  public getAllServers(): Map<string | RegExp, ObservableSocketServer> {
    return this.observableServers;
  }

  public getServerByPort(port: number): ObservableSocketServer {
    return this.observableServers.get(`${port}`);
  }

  public addServer(
    namespace: string | RegExp,
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
