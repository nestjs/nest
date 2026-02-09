import { isObject } from '@nestjs/common/utils/shared.utils.js';
import { ReadPacket, Serializer } from '../interfaces/index.js';
import { MqttRecord } from '../record-builders/index.js';

export class MqttRecordSerializer implements Serializer<ReadPacket, string> {
  serialize(packet: ReadPacket): string {
    if (isObject(packet?.data) && packet.data instanceof MqttRecord) {
      const record = packet.data;
      return JSON.stringify({
        ...packet,
        data: record.data,
      });
    }
    return JSON.stringify(packet);
  }
}
