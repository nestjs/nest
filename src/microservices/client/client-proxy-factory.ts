import { ClientTCP } from './client-tcp';
import { ClientRedis } from './client-redis';
import { ClientMetadata } from '../interfaces/client-metadata.interface';
import { Transport } from '../enums/transport.enum';
import { ClientProxy } from './client-proxy';
import { Closeable } from '../interfaces/closeable.interface';

export class ClientProxyFactory {
  public static create(metadata: ClientMetadata): ClientProxy & Closeable {
    const { transport } = metadata;
    switch (transport) {
      case Transport.REDIS:
        return new ClientRedis(metadata);
      default:
        return new ClientTCP(metadata);
    }
  }
}
