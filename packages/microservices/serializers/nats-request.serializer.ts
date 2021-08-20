import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { NatsCodec } from '../external/nats-client.interface';
import { Serializer } from '../interfaces/serializer.interface';
import { MsgHdrs, headers as createHeaders } from 'nats';
import { ReadPacket } from '../interfaces';

let natsPackage = {} as any;

export interface NatsRequest {
  data: Uint8Array;
  headers?: MsgHdrs;
}

class NatsMessage {
  constructor(
    public readonly headers: MsgHdrs | undefined,
    public readonly data: any,
  ) {}
}

export class NatsMessageBuilder<T extends any> {
  private headers: MsgHdrs | undefined;
  private data: T | undefined;

  constructor(data: T | undefined = undefined) {
    this.data = data;
  }

  public setHeaders(headers: MsgHdrs | undefined): NatsMessageBuilder<T> {
    this.headers = headers;
    return this;
  }

  public setPlainHeaders(
    headers: Record<string, string>,
  ): NatsMessageBuilder<T> {
    const natsHeaders = createHeaders();
    for (const key in headers) {
      if (headers.hasOwnProperty(key)) {
        natsHeaders.set(key, headers[key]);
      }
    }
    return this.setHeaders(natsHeaders);
  }

  public setData(data: T | undefined): NatsMessageBuilder<T> {
    this.data = data;
    return this;
  }

  public build(): NatsMessage {
    return new NatsMessage(this.headers, this.data);
  }
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
    const natsMessage =
      packet?.data instanceof NatsMessage
        ? packet.data as NatsMessage
        : new NatsMessageBuilder(packet?.data).build();

    return {
      data: this.jsonCodec.encode({ ...packet, data: natsMessage.data }),
      headers: natsMessage.headers,
    };
  }
}
