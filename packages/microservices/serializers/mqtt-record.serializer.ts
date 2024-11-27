import { isObject } from '@nestjs/common/utils/shared.utils';
import { ReadPacket, Serializer } from '../interfaces';
import { MqttRecord } from '../record-builders';

export class MqttRecordSerializer
  implements Serializer<ReadPacket, ReadPacket & Partial<MqttRecord>>
{
  serialize(packet: ReadPacket): ReadPacket & Partial<MqttRecord> {
    if (
      packet?.data &&
      isObject(packet.data) &&
      packet.data instanceof MqttRecord
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
