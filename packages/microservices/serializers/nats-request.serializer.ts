import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { NatsCodec } from '../external/nats-client.interface';
import { Serializer } from '../interfaces/serializer.interface';
import { MsgHdrs, headers as createHeaders } from 'nats';
import { ReadPacket } from '../interfaces';

let natsPackage = {} as any;

export interface NatsRequest {
  value: Uint8Array;
  headers?: MsgHdrs;
}

export class NatsRequestSerializer implements Serializer {
  private readonly jsonCodec: NatsCodec<unknown>;

  constructor() {
    natsPackage = loadPackage('nats', NatsRequestSerializer.name, () =>
      require('nats'),
    );
    this.jsonCodec = natsPackage.JSONCodec();
  }

  serialize(packet: ReadPacket | any): NatsRequest {
    let headers: MsgHdrs | undefined;
    const value = packet.data?.value ? packet.data.value : packet.data;
    if (packet?.data?.headers) {
      // MsgHdrs.code
      if (
        Symbol.iterator in Object(packet.data.headers) &&
        'code' in packet.data.headers
      ) {
        headers = packet.data.headers;
      } else {
        headers = createHeaders();
        for (const headerKey in packet.data.headers) {
          if (packet.data.headers.hasOwnProperty(headerKey)) {
            headers.set(headerKey, packet.data.headers[headerKey]);
          }
        }
      }
    }

    return {
      value: this.jsonCodec.encode({ ...packet, data: value }),
      headers: headers,
    };
  }
}
