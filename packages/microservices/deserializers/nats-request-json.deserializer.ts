import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isObject, isUndefined } from '@nestjs/common/utils/shared.utils';
import { NatsCodec } from '../external/nats-codec.interface';
import { IncomingEvent, IncomingRequest } from '../interfaces';
import { IncomingRequestDeserializer } from './incoming-request.deserializer';

let natsPackage = {} as any;

// The only keys a reply of a Nest server carries. "status" is set by the
// "no handler" packet.
const REPLY_KEYS = new Set(['id', 'err', 'response', 'isDisposed', 'status']);

/**
 * Whether the value is a reply of a Nest server: a packet with no keys other
 * than those of a reply, among them the id of the request and a response, an
 * error or the end of the response stream.
 */
function isReply(value: any): boolean {
  return (
    isObject(value) &&
    Object.keys(value).every(key => REPLY_KEYS.has(key)) &&
    !isUndefined((value as Record<string, unknown>).id) &&
    (!isUndefined((value as Record<string, unknown>).response) ||
      !isUndefined((value as Record<string, unknown>).err) ||
      !isUndefined((value as Record<string, unknown>).isDisposed))
  );
}

/**
 * @publicApi
 */
export class NatsRequestJSONDeserializer extends IncomingRequestDeserializer {
  private readonly jsonCodec: NatsCodec<unknown>;

  constructor() {
    super();

    natsPackage = loadPackage('nats', NatsRequestJSONDeserializer.name, () =>
      require('nats'),
    );
    this.jsonCodec = natsPackage.JSONCodec();
  }

  deserialize(
    value: Uint8Array,
    options?: Record<string, any>,
  ): IncomingRequest | IncomingEvent {
    const decodedRequest = this.jsonCodec.decode(value);
    return super.deserialize(decodedRequest, options);
  }

  /**
   * A reply of a Nest server is not a message of an external system. On NATS
   * the requester names the subject its reply is published on, so a reply
   * can arrive on the subject of a handler. Mapped to the schema, it would
   * reach that handler as an event; left as it is, `ServerNats` skips it.
   */
  isExternal(value: any): boolean {
    return super.isExternal(value) && !isReply(value);
  }
}
