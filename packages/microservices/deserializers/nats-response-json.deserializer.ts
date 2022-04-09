import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { NatsCodec } from '../external/nats-client.interface';
import { IncomingResponse } from '../interfaces';
import { IncomingResponseDeserializer } from './incoming-response.deserializer';
import { NatsRequestJSONDeserializer } from './nats-request-json.deserializer';

let natsPackage = {} as any;

export class NatsResponseJSONDeserializer extends IncomingResponseDeserializer {
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
  ): IncomingResponse {
    const decodedRequest = this.jsonCodec.decode(value);
    return super.deserialize(decodedRequest, options);
  }
}
