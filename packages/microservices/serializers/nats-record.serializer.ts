import { isObject } from '@nestjs/common/internal';
import { ReadPacket } from '../interfaces/index.js';
import { Serializer } from '../interfaces/serializer.interface.js';
import { NatsRecord, NatsRecordBuilder } from '../record-builders/index.js';

export class NatsRecordSerializer implements Serializer<
  ReadPacket,
  NatsRecord
> {
  serialize(packet: any): NatsRecord {
    if (packet?.response instanceof NatsRecord) {
      const record = packet.response;
      return {
        data: JSON.stringify({ ...packet, response: record.data }),
        headers: record.headers,
      };
    }
    const natsMessage =
      packet?.data && isObject(packet.data) && packet.data instanceof NatsRecord
        ? packet.data
        : new NatsRecordBuilder(packet?.data)
            .setHeaders(packet?.headers)
            .build();

    return {
      data: JSON.stringify({ ...packet, data: natsMessage.data }),
      headers: natsMessage.headers,
    };
  }
}
