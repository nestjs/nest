import { Transport } from '../enums/transport.enum';
import { CustomTransportStrategy, MicroserviceOptions } from '../interfaces';
import { Server } from './server';
import { ServerGrpc } from './server-grpc';
import { ServerKafka } from './server-kafka';
import { ServerMqtt } from './server-mqtt';
import { ServerNats } from './server-nats';
import { ServerRedis } from './server-redis';
import { ServerTCP } from './server-tcp';
import { ServerLocalDomain } from './server-local-domain';
import { ServerRMQ } from './server-rmq';

export class ServerFactory {
  public static create(
    microserviceOptions: MicroserviceOptions,
  ): Server & CustomTransportStrategy {
    const { transport, options } = microserviceOptions as any;
    switch (transport) {
      case Transport.REDIS:
        return new ServerRedis(options);
      case Transport.NATS:
        return new ServerNats(options);
      case Transport.MQTT:
        return new ServerMqtt(options);
      case Transport.GRPC:
        return new ServerGrpc(options);
      case Transport.KAFKA:
        return new ServerKafka(options);
      case Transport.RMQ:
        return new ServerRMQ(options);
      case Transport.LOCAL_DOMAIN:
        return new ServerLocalDomain(options);
      default:
        return new ServerTCP(options);
    }
  }
}
