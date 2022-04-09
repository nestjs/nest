import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { NatsCodec } from '../external/nats-client.interface';
import { ReadPacket } from '../interfaces';
import { Serializer } from '../interfaces/serializer.interface';
import { NatsRecord, NatsRecordBuilder } from '../record-builders';

let natsPackage = {} as any;

export class NatsRecordSerializer
  implements Serializer<ReadPacket, NatsRecord>
{
  private readonly jsonCodec: NatsCodec<unknown>;

  constructor() {
    natsPackage = loadPackage('nats', NatsRecordSerializer.name, () =>
      require('nats'),
    );
    this.jsonCodec = natsPackage.JSONCodec();
  }

  serialize(packet: ReadPacket | any): NatsRecord {
    const natsMessage =
      packet?.data && isObject(packet.data) && packet.data instanceof NatsRecord
        ? (packet.data as NatsRecord)
        : new NatsRecordBuilder(packet?.data).build();

    return {
      data: this.jsonCodec.encode({ ...packet, data: natsMessage.data }),
      headers: natsMessage.headers,
    };
  }
}
