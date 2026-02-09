import { loadPackageSync } from '@nestjs/common/utils/load-package.util.js';
import { createRequire } from 'module';
import { NatsCodec } from '../external/nats-codec.interface.js';
import { IncomingResponse } from '../interfaces/index.js';
import { IncomingResponseDeserializer } from './incoming-response.deserializer.js';

let natsPackage = {} as any;

/**
 * @publicApi
 */
export class NatsResponseJSONDeserializer extends IncomingResponseDeserializer {
  private readonly jsonCodec: NatsCodec<unknown>;

  constructor() {
    super();

    natsPackage = loadPackageSync(
      'nats',
      NatsResponseJSONDeserializer.name,
      () => createRequire(import.meta.url)('nats'),
    );
    this.jsonCodec = natsPackage.JSONCodec();
  }

  deserialize(
    value: Uint8Array,
    options?: Record<string, any>,
  ): IncomingResponse | Promise<IncomingResponse> {
    const decodedRequest = this.jsonCodec.decode(value);
    return super.deserialize(decodedRequest, options);
  }
}
