import { ReadPacket, Serializer, WritePacket } from '../interfaces/index.js';
import { MqttRecord } from '../record-builders/index.js';
import { isObject } from '@nestjs/common/internal';

export class MqttRecordSerializer implements Serializer<
  Partial<ReadPacket> & WritePacket,
  string
> {
  serialize(packet: Partial<ReadPacket> & WritePacket): string {
    if (isObject(packet?.data) && packet.data instanceof MqttRecord) {
      const record = packet.data;
      return JSON.stringify({
        ...packet,
        data: record.data,
      });
    }
    if (packet?.response instanceof MqttRecord) {
      return JSON.stringify({
        ...packet,
        response: packet.response.data,
      });
    }
    return JSON.stringify(packet);
  }
}
