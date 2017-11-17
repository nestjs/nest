import {Transport} from '../enums/transport.enum';
import {ClientMetadata} from '../interfaces/client-metadata.interface';
import {Closeable} from '../interfaces/closeable.interface';

import {ClientProxy} from './client-proxy';
import {ClientRedis} from './client-redis';
import {ClientTCP} from './client-tcp';

export class ClientProxyFactory {
  public static create(metadata: ClientMetadata): ClientProxy&Closeable {
    const {transport} = metadata;

    switch (transport) {
    case Transport.REDIS:
      return new ClientRedis(metadata);
    default:
      return new ClientTCP(metadata);
    }
  }
}