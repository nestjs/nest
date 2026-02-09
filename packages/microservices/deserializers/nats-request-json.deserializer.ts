import { loadPackage } from '@nestjs/common/utils/load-package.util.js';
import { NatsCodec } from '../external/nats-codec.interface.js';
import { IncomingEvent, IncomingRequest } from '../interfaces/index.js';
import { IncomingRequestDeserializer } from './incoming-request.deserializer.js';

let natsPackage = {} as any;

/**
 * @publicApi
 */
export class NatsRequestJSONDeserializer extends IncomingRequestDeserializer {
  private jsonCodec: NatsCodec<unknown>;

  constructor() {
    super();

    natsPackage = loadPackage(
      'nats',
      NatsRequestJSONDeserializer.name,
      () => import('nats'),
    );
  }

  async init() {
    natsPackage = await natsPackage;
    this.jsonCodec = natsPackage.JSONCodec();
  }

  private ensureJsonCodec() {
    if (!this.jsonCodec) {
      this.jsonCodec = natsPackage.JSONCodec();
    }
  }

  deserialize(
    value: Uint8Array,
    options?: Record<string, any>,
  ):
    | IncomingRequest
    | IncomingEvent
    | Promise<IncomingRequest | IncomingEvent> {
    this.ensureJsonCodec();
    const decodedRequest = this.jsonCodec.decode(value);
    return super.deserialize(decodedRequest, options);
  }
}
