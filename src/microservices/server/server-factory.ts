import {Transport} from '../enums/transport.enum';
import {
  CustomTransportStrategy,
  MicroserviceConfiguration
} from '../interfaces';

import {Server} from './server';
import {ServerRedis} from './server-redis';
import {ServerTCP} from './server-tcp';

export class ServerFactory {
  public static create(config: MicroserviceConfiguration): Server
      &CustomTransportStrategy {
    const {transport} = config;
    switch (transport) {
    case Transport.REDIS:
      return new ServerRedis(config);
    default:
      return new ServerTCP(config);
    }
  }
}