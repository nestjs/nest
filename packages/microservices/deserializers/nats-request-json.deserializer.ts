import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { NatsCodec } from '../external/nats-client.interface';
import { IncomingEvent, IncomingRequest } from '../interfaces';
import { IncomingRequestDeserializer } from './incoming-request.deserializer';

let natsPackage = {} as any;

/**
 * @publicApi
 */
export class NatsRequestJSONDeserializer extends IncomingRequestDeserializer {
  private readonly jsonCodec: NatsCodec<unknown>;

  constructor() {
    super();

    natsPackage = loadPackage('nats', NatsRequestJSONDeserializer.name, () =>
      require('nats'),
    );
    this.jsonCodec = natsPackage.JSONCodec();
  }

  deserialize(
    value: Uint8Array,
    options?: Record<string, any>,
  ): IncomingRequest | IncomingEvent {
    const decodedRequest = this.jsonCodec.decode(value);
    return super.deserialize(decodedRequest, options);
  }
}
