import { ClientTCP } from './client-tcp';
import { ClientRedis } from './client-redis';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { Transport } from '../enums/transport.enum';
import { ClientProxy } from './client-proxy';
import { Closeable } from '../interfaces/closeable.interface';
import { ClientNats } from './client-nats';
import { ClientMqtt } from './client-mqtt';
import { ClientGrpcProxy } from './client-grpc';

export class ClientProxyFactory {
  public static create(options: ClientOptions): ClientProxy & Closeable {
    const { transport } = options;
    switch (transport) {
      case Transport.REDIS:
        return new ClientRedis(options);
      case Transport.NATS:
        return new ClientNats(options);
      case Transport.MQTT:
        return new ClientMqtt(options);
      case Transport.GRPC:
        return new ClientGrpcProxy(options);
      default:
        return new ClientTCP(options);
    }
  }
}
