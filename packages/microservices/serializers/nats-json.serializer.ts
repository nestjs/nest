import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { NatsCodec } from '../external/nats-client.interface';
import { Serializer } from '../interfaces/serializer.interface';

let natsPackage = {} as any;

export class NatsJSONSerializer implements Serializer {
  private readonly jsonCodec: NatsCodec<unknown>;

  constructor() {
    natsPackage = loadPackage('nats', NatsJSONSerializer.name, () =>
      require('nats'),
    );
    this.jsonCodec = natsPackage.JSONCodec();
  }

  serialize(value: Uint8Array) {
    const json = this.jsonCodec.encode(value);
    return json;
  }
}
