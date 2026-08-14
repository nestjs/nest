import { IncomingResponse } from '../interfaces/index.js';
import { IncomingResponseDeserializer } from './incoming-response.deserializer.js';

// To enable type safety for Nats. This cant be uncommented by default
// because it would require the user to install the nats package even if they dont use Nats
// Otherwise, TypeScript would fail to compile the code.
//
// type NatsMsg = import('@nats-io/transport-node').Msg;

type NatsMsg = any;

/**
 * @publicApi
 */
export class NatsResponseJSONDeserializer extends IncomingResponseDeserializer {
  deserialize(
    value: NatsMsg,
    options?: Record<string, any>,
  ): IncomingResponse | Promise<IncomingResponse> {
    const decodedRequest = value.json();
    return super.deserialize(decodedRequest, options);
  }
}
