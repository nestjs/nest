import { Transport } from '../enums/transport.enum';
import {
  CustomStrategy,
  GrpcOptions,
  KafkaOptions,
  MicroserviceOptions,
  MqttOptions,
  NatsOptions,
  RedisOptions,
  RmqOptions,
  TcpOptions,
} from '../interfaces';
import { ServerGrpc } from './server-grpc';
import { ServerKafka } from './server-kafka';
import { ServerMqtt } from './server-mqtt';
import { ServerNats } from './server-nats';
import { ServerRedis } from './server-redis';
import { ServerRMQ } from './server-rmq';
import { ServerTCP } from './server-tcp';

export class ServerFactory {
  public static create(microserviceOptions: MicroserviceOptions) {
    const { transport, options } = microserviceOptions as Exclude<
      MicroserviceOptions,
      CustomStrategy
    >;
    switch (transport) {
      case Transport.REDIS:
        return new ServerRedis(options as Required<RedisOptions>['options']);
      case Transport.NATS:
        return new ServerNats(options as Required<NatsOptions>['options']);
      case Transport.MQTT:
        return new ServerMqtt(options as Required<MqttOptions>['options']);
      case Transport.GRPC:
        return new ServerGrpc(options);
      case Transport.KAFKA:
        return new ServerKafka(options as Required<KafkaOptions>['options']);
      case Transport.RMQ:
        return new ServerRMQ(options as Required<RmqOptions>['options']);
      default:
        return new ServerTCP(options as Required<TcpOptions>['options']);
    }
  }
}
