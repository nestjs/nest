import { Transport } from '../enums/transport.enum.js';
import { ClientKafkaProxy } from '../interfaces/index.js';
import {
  ClientOptions,
  CustomClientOptions,
  TcpClientOptions,
} from '../interfaces/client-metadata.interface.js';
import {
  GrpcOptions,
  KafkaOptions,
  MqttOptions,
  NatsOptions,
  RedisOptions,
  RmqOptions,
} from '../interfaces/microservice-configuration.interface.js';
import { ClientGrpcProxy } from './client-grpc.js';
import { ClientKafka } from './client-kafka.js';
import { ClientMqtt } from './client-mqtt.js';
import { ClientNats } from './client-nats.js';
import { ClientProxy } from './client-proxy.js';
import { ClientRedis } from './client-redis.js';
import { ClientRMQ } from './client-rmq.js';
import { ClientTCP } from './client-tcp.js';

export interface IClientProxyFactory {
  create(clientOptions: ClientOptions): ClientProxy;
}

/**
 * @publicApi
 */
export class ClientProxyFactory {
  public static create(
    clientOptions: { transport: Transport.GRPC } & ClientOptions,
  ): ClientGrpcProxy;
  public static create(
    clientOptions: { transport: Transport.KAFKA } & ClientOptions,
  ): ClientKafkaProxy;
  public static create(clientOptions: ClientOptions): ClientProxy;
  public static create(clientOptions: CustomClientOptions): ClientProxy;
  public static create(
    clientOptions: ClientOptions | CustomClientOptions,
  ): ClientProxy | ClientGrpcProxy | ClientKafkaProxy {
    if (this.isCustomClientOptions(clientOptions)) {
      const { customClass, options } = clientOptions;
      return new customClass(options);
    }
    const { transport, options = {} } = clientOptions ?? { options: {} };
    switch (transport) {
      case Transport.REDIS:
        return new ClientRedis(
          options as Required<RedisOptions>['options'],
        ) as ClientProxy;
      case Transport.NATS:
        return new ClientNats(
          options as Required<NatsOptions>['options'],
        ) as ClientProxy;
      case Transport.MQTT:
        return new ClientMqtt(
          options as Required<MqttOptions>['options'],
        ) as ClientProxy;
      case Transport.GRPC:
        return new ClientGrpcProxy(options as GrpcOptions['options']);
      case Transport.RMQ:
        return new ClientRMQ(
          options as Required<RmqOptions>['options'],
        ) as ClientProxy;
      case Transport.KAFKA:
        return new ClientKafka(options as Required<KafkaOptions>['options']);
      default:
        return new ClientTCP(
          options as Required<TcpClientOptions>['options'],
        ) as ClientProxy;
    }
  }

  private static isCustomClientOptions(
    options: ClientOptions | CustomClientOptions,
  ): options is CustomClientOptions {
    return !!(options as CustomClientOptions).customClass;
  }
}
