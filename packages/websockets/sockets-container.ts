import { SocketEventsHost } from './interfaces';

export class SocketsContainer {
  private readonly socketEventHosts = new Map<
    string | RegExp,
    SocketEventsHost
  >();

  public getAllSocketEventHosts(): Map<string | RegExp, SocketEventsHost> {
    return this.socketEventHosts;
  }

  public getSocketEventsHostByPort(port: number): SocketEventsHost {
    return this.socketEventHosts.get(`${port}`);
  }

  public addSocketEventsHost(
    namespace: string | RegExp,
    port: number,
    host: SocketEventsHost,
  ) {
    this.socketEventHosts.set(
      namespace ? `${namespace}:${port}` : `${port}`,
      host,
    );
  }

  public clear() {
    this.socketEventHosts.clear();
  }
}
