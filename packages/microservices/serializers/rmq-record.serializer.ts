import { isObject } from '@nestjs/common/utils/shared.utils';
import { ReadPacket } from '../interfaces';
import { Serializer } from '../interfaces/serializer.interface';
import { RmqRecord } from '../record-builders';

export class RmqRecordSerializer
  implements Serializer<ReadPacket, ReadPacket & Partial<RmqRecord>>
{
  serialize(packet: ReadPacket): ReadPacket & Partial<RmqRecord> {
    if (
      packet?.data &&
      isObject(packet.data) &&
      packet.data instanceof RmqRecord
    ) {
      const record = packet.data;
      return {
        ...packet,
        data: record.data,
        options: record.options,
      };
    }
    return packet;
  }
}
