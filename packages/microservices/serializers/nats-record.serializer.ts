import { loadPackage } from '@nestjs/common/utils/load-package.util.js';
import { isObject } from '@nestjs/common/utils/shared.utils.js';
import { NatsCodec } from '../external/nats-codec.interface.js';
import { ReadPacket } from '../interfaces/index.js';
import { Serializer } from '../interfaces/serializer.interface.js';
import { NatsRecord, NatsRecordBuilder } from '../record-builders/index.js';

let natsPackage = {} as any;

export class NatsRecordSerializer implements Serializer<
  ReadPacket,
  NatsRecord
> {
  private jsonCodec: NatsCodec<unknown>;

  constructor() {
    natsPackage = loadPackage(
      'nats',
      NatsRecordSerializer.name,
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

  serialize(packet: any): NatsRecord {
    this.ensureJsonCodec();
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
