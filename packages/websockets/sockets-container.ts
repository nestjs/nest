import * as hash from 'object-hash';
import { GatewayMetadata, ServerAndEventStreamsHost } from './interfaces';

export class SocketsContainer {
  private readonly serverAndEventStreamsHosts = new Map<
    string | RegExp,
    ServerAndEventStreamsHost
  >();

  public getAll(): Map<string | RegExp, ServerAndEventStreamsHost> {
    return this.serverAndEventStreamsHosts;
  }

  public getOneByConfig<T extends GatewayMetadata = any>(
    options: T,
  ): ServerAndEventStreamsHost {
    const uniqueToken = this.generateHashByOptions(options);
    return this.serverAndEventStreamsHosts.get(uniqueToken)!;
  }

  public addOne<T extends GatewayMetadata = any>(
    options: T,
    host: ServerAndEventStreamsHost,
  ) {
    const uniqueToken = this.generateHashByOptions(options);
    this.serverAndEventStreamsHosts.set(uniqueToken, host);
  }

  public clear() {
    this.serverAndEventStreamsHosts.clear();
  }

  private generateHashByOptions<T extends GatewayMetadata = any>(
    options: T,
  ): string {
    return hash(options, { ignoreUnknown: true });
  }
}
