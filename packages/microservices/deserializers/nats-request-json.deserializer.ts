import { createRequire } from 'module';
import { NatsCodec } from '../external/nats-codec.interface.js';
import { IncomingEvent, IncomingRequest } from '../interfaces/index.js';
import { IncomingRequestDeserializer } from './incoming-request.deserializer.js';
import { loadPackageSync } from '@nestjs/common/internal';

let natsPackage = {} as any;

/**
 * @publicApi
 */
export class NatsRequestJSONDeserializer extends IncomingRequestDeserializer {
  private readonly jsonCodec: NatsCodec<unknown>;

  constructor() {
    super();

    natsPackage = loadPackageSync(
      'nats',
      NatsRequestJSONDeserializer.name,
      () => createRequire(import.meta.url)('nats'),
    );
    this.jsonCodec = natsPackage.JSONCodec();
  }

  deserialize(
    value: Uint8Array,
    options?: Record<string, any>,
  ):
    | IncomingRequest
    | IncomingEvent
    | Promise<IncomingRequest | IncomingEvent> {
    const decodedRequest = this.jsonCodec.decode(value);
    return super.deserialize(decodedRequest, options);
  }
}
