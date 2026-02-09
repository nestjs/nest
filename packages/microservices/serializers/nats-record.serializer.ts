import { loadPackageSync } from '@nestjs/common/utils/load-package.util.js';
import { isObject } from '@nestjs/common/utils/shared.utils.js';
import { createRequire } from 'module';
import { NatsCodec } from '../external/nats-codec.interface.js';
import { ReadPacket } from '../interfaces/index.js';
import { Serializer } from '../interfaces/serializer.interface.js';
import { NatsRecord, NatsRecordBuilder } from '../record-builders/index.js';

let natsPackage = {} as any;

export class NatsRecordSerializer implements Serializer<
  ReadPacket,
  NatsRecord
> {
  private readonly jsonCodec: NatsCodec<unknown>;

  constructor() {
    natsPackage = loadPackageSync('nats', NatsRecordSerializer.name, () =>
      createRequire(import.meta.url)('nats'),
    );
    this.jsonCodec = natsPackage.JSONCodec();
  }

  serialize(packet: any): NatsRecord {
    const natsMessage =
      packet?.data && isObject(packet.data) && packet.data instanceof NatsRecord
        ? packet.data
        : new NatsRecordBuilder(packet?.data).build();

    return {
      data: this.jsonCodec.encode({ ...packet, data: natsMessage.data }),
      headers: natsMessage.headers,
    };
  }
}
