import { isObject } from '@nestjs/common/utils/shared.utils';
import { ReadPacket, Serializer } from '../interfaces';
import { MqttRecord } from '../record-builders';

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
