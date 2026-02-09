import { loadPackage } from '@nestjs/common/utils/load-package.util.js';
import { NatsCodec } from '../external/nats-codec.interface.js';
import { IncomingResponse } from '../interfaces/index.js';
import { IncomingResponseDeserializer } from './incoming-response.deserializer.js';

let natsPackage = {} as any;

/**
 * @publicApi
 */
export class NatsResponseJSONDeserializer extends IncomingResponseDeserializer {
  private jsonCodec: NatsCodec<unknown>;

  constructor() {
    super();

    natsPackage = loadPackage(
      'nats',
      NatsResponseJSONDeserializer.name,
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
  ): IncomingResponse | Promise<IncomingResponse> {
    this.ensureJsonCodec();
    const decodedRequest = this.jsonCodec.decode(value);
    return super.deserialize(decodedRequest, options);
  }
}
