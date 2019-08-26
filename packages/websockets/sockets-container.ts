import { SocketEventsHost } from './interfaces';

export class SocketsContainer {
  private readonly observableServers = new Map<
    string | RegExp,
    SocketEventsHost
  >();

  public getAllServers(): Map<string | RegExp, SocketEventsHost> {
    return this.observableServers;
  }

  public getServerByPort(port: number): SocketEventsHost {
    return this.observableServers.get(`${port}`);
  }

  public addServer(
    namespace: string | RegExp,
    port: number,
    server: SocketEventsHost,
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
