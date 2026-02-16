import { isObject } from '@nestjs/common/internal';
import { ReadPacket } from '../interfaces/index.js';
import { Serializer } from '../interfaces/serializer.interface.js';
import { NatsRecord, NatsRecordBuilder } from '../record-builders/index.js';

export class NatsRecordSerializer implements Serializer<
  ReadPacket,
  NatsRecord
> {
  serialize(packet: any): NatsRecord {
    const natsMessage =
      packet?.data && isObject(packet.data) && packet.data instanceof NatsRecord
        ? packet.data
        : new NatsRecordBuilder(packet?.data).build();

    return {
      data: JSON.stringify({ ...packet, data: natsMessage.data }),
      headers: natsMessage.headers,
    };
  }
}
