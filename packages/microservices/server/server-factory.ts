import { Transport } from '../enums/transport.enum';
import {
  CustomStrategy,
  MicroserviceOptions,
  MqttOptions,
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
        return new ServerRedis(options as ServerRedis['options']);
      case Transport.NATS:
        return new ServerNats(options as ServerNats['options']);
      case Transport.MQTT:
        return new ServerMqtt(options as MqttOptions['options']);
      case Transport.GRPC:
        return new ServerGrpc(options as ServerGrpc['options']);
      case Transport.KAFKA:
        return new ServerKafka(options as ServerKafka['options']);
      case Transport.RMQ:
        return new ServerRMQ(options as ServerRMQ['options']);
      default:
        return new ServerTCP(options as ServerTCP['options']);
    }
  }
}
