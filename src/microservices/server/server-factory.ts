import { ServerTCP } from './server-tcp';
import { ServerRedis } from './server-redis';
import {
  MicroserviceOptions,
  CustomTransportStrategy,
} from '../interfaces';
import { Server } from './server';
import { Transport } from '../enums/transport.enum';
import { race } from 'rxjs/operators/race';
import { ServerNats } from './server-nats';

export class ServerFactory {
  public static create(
    options: MicroserviceOptions,
  ): Server & CustomTransportStrategy {
    const { transport } = options;
    switch (transport) {
      case Transport.REDIS:
        return new ServerRedis(options);
      case Transport.NATS:
        return new ServerNats(options);
      default:
        return new ServerTCP(options);
    }
  }
}
