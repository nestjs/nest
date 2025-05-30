import { isObject } from '@nestjs/common/utils/shared.utils';
import { ReadPacket } from '../interfaces';
import { Serializer } from '../interfaces/serializer.interface';
import { NatsRecord, NatsRecordBuilder } from '../record-builders';

export class NatsRecordSerializer
  implements Serializer<ReadPacket, NatsRecord>
{
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
