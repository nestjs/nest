import { ServerTCP } from './server-tcp';
import { ServerRedis } from './server-redis';
import {
  MicroserviceOptions,
  CustomTransportStrategy,
} from '../interfaces';
import { Server } from './server';
import { Transport } from '../enums/transport.enum';
import { race } from 'rxjs/operators';
import { ServerNats } from './server-nats';
import { ServerMqtt } from './server-mqtt';
import { ServerGrpc } from './server-grpc';

export class ServerFactory {
  public static create(
    options: MicroserviceOptions,
  ): Server & CustomTransportStrategy {
    const { transport } = options as any;
    switch (transport) {
      case Transport.REDIS:
        return new ServerRedis(options);
      case Transport.NATS:
        return new ServerNats(options);
      case Transport.MQTT:
        return new ServerMqtt(options);
      case Transport.GRPC:
        return new ServerGrpc(options);
      default:
        return new ServerTCP(options);
    }
  }
}
