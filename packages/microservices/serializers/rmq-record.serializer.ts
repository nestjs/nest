import { ReadPacket, WritePacket } from '../interfaces/index.js';
import { Serializer } from '../interfaces/serializer.interface.js';
import { RmqRecord } from '../record-builders/index.js';
import { isObject } from '@nestjs/common/internal';

export class RmqRecordSerializer implements Serializer<
  Partial<ReadPacket> & WritePacket,
  Partial<ReadPacket> & WritePacket & Partial<RmqRecord>
> {
  serialize(
    packet: Partial<ReadPacket> & WritePacket,
  ): Partial<ReadPacket> & WritePacket & Partial<RmqRecord> {
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
    if (packet?.response instanceof RmqRecord) {
      const record = packet.response;
      return {
        ...packet,
        response: record.data,
        options: record.options,
      };
    }
    return packet;
  }
}
