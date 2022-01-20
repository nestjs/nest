import { isObject } from '@nestjs/common/utils/shared.utils';
import { ReadPacket } from '../interfaces';
import { Serializer } from '../interfaces/serializer.interface';
import { MqttRecord } from '../record-builders';

export class MqttRecordSerializer implements Serializer<ReadPacket, string> {
  serialize(packet: ReadPacket | any): string {
    if (isObject(packet?.data) && packet.data instanceof MqttRecord) {
      const record = packet.data as MqttRecord;
      return JSON.stringify({
        ...packet,
        data: record.data,
      });
    }
    return JSON.stringify(packet);
  }
}
