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

  serialize(value: ReadPacket | any): NatsRequest {
    let headers: MsgHdrs | undefined;
    if (value?.data?.headers) {
      // MsgHdrs.code
      if (Symbol.iterator in Object(value.data.headers) && 'code' in value.data.headers) {
        headers = value.data.headers;
      } else {
        headers = createHeaders();
        for (const headerKey in value.data.headers) {
          if (value.data.headers.hasOwnProperty(headerKey)) {
            headers.set(headerKey, value.data.headers[headerKey]);
          }
        }
      }
      delete value.data.headers;
    }

    return {
      value: this.jsonCodec.encode(value),
      headers: headers,
    };
  }
}
