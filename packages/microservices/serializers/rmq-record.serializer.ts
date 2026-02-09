import { isObject } from '@nestjs/common/utils/shared.utils.js';
import { ReadPacket } from '../interfaces/index.js';
import { Serializer } from '../interfaces/serializer.interface.js';
import { RmqRecord } from '../record-builders/index.js';

export class RmqRecordSerializer implements Serializer<
  ReadPacket,
  ReadPacket & Partial<RmqRecord>
> {
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
