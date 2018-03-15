import { ClientTCP } from './client-tcp';
import { ClientRedis } from './client-redis';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { Transport } from '../enums/transport.enum';
import { ClientProxy } from './client-proxy';
import { Closeable } from '../interfaces/closeable.interface';
import { ClientNats } from './client-nats';

export class ClientProxyFactory {
  public static create(options: ClientOptions): ClientProxy & Closeable {
    const { transport } = options;
    switch (transport) {
      case Transport.REDIS:
        return new ClientRedis(options);
      case Transport.NATS:
        return new ClientNats(options);
      default:
        return new ClientTCP(options);
    }
  }
}
