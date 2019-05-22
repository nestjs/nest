import { Transport } from '../enums/transport.enum';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { Closeable } from '../interfaces/closeable.interface';
import { ClientGrpcProxy } from './client-grpc';
import { ClientMqtt } from './client-mqtt';
import { ClientNats } from './client-nats';
import { ClientProxy } from './client-proxy';
import { ClientRedis } from './client-redis';
import { ClientRMQ } from './client-rmq';
import { ClientTCP } from './client-tcp';

export interface IClientProxyFactory {
  create(clientOptions: ClientOptions): ClientProxy & Closeable;
}

export class ClientProxyFactory {
  public static create(
    clientOptions: { transport: Transport.GRPC } & ClientOptions,
  ): ClientGrpcProxy;
  public static create(clientOptions: ClientOptions): ClientProxy & Closeable;
  public static create(clientOptions: ClientOptions): ClientProxy & Closeable {
    const { transport, options } = clientOptions;
    switch (transport) {
      case Transport.REDIS:
        return new ClientRedis(options);
      case Transport.NATS:
        return new ClientNats(options);
      case Transport.MQTT:
        return new ClientMqtt(options);
      case Transport.GRPC:
        return new ClientGrpcProxy(options);
      case Transport.RMQ:
        return new ClientRMQ(options);
      default:
        return new ClientTCP(options);
    }
  }
}
