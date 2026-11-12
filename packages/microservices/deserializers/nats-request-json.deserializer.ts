import { IncomingEvent, IncomingRequest } from '../interfaces/index.js';
import { IncomingRequestDeserializer } from './incoming-request.deserializer.js';
import { IncomingResponseDeserializer } from './incoming-response.deserializer.js';
import { isUndefined } from '@nestjs/common/internal';

// To enable type safety for Nats. This cant be uncommented by default
// because it would require the user to install the nats package even if they dont use Nats
// Otherwise, TypeScript would fail to compile the code.
//
// type NatsMsg = import('@nats-io/transport-node').Msg;

type NatsMsg = any;

const responseDeserializer = new IncomingResponseDeserializer();

/**
 * Whether the value is a reply of a Nest server: a packet with no keys other
 * than those of a reply, among them the id of the request and a response, an
 * error or the end of the response stream.
 */
function isReply(value: any): boolean {
  return (
    !responseDeserializer.isExternal(value) &&
    !isUndefined(value.id) &&
    (!isUndefined(value.response) ||
      !isUndefined(value.err) ||
      !isUndefined(value.isDisposed))
  );
}

/**
 * @publicApi
 */
export class NatsRequestJSONDeserializer extends IncomingRequestDeserializer {
  deserialize(
    value: NatsMsg,
    options?: Record<string, any>,
  ):
    | IncomingRequest
    | IncomingEvent
    | Promise<IncomingRequest>
    | Promise<IncomingEvent> {
    const decodedRequest = value.json();
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
