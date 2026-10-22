import { KafkaHeaders } from '../enums/kafka-headers.enum.js';
import { Deserializer, IncomingResponse } from '../interfaces/index.js';
import { isUndefined } from '@nestjs/common/internal';

/**
 * @publicApi
 */
export class KafkaResponseDeserializer implements Deserializer<
  any,
  IncomingResponse
> {
  deserialize(message: any, options?: Record<string, any>): IncomingResponse {
    const id = message.headers[KafkaHeaders.CORRELATION_ID].toString();
    if (!isUndefined(message.headers[KafkaHeaders.NEST_ERR])) {
      return {
        id,
        err: message.headers[KafkaHeaders.NEST_ERR],
        isDisposed: true,
      };
    }
    if (!isUndefined(message.headers[KafkaHeaders.NEST_IS_DISPOSED])) {
      // A record cannot leave its value out, so the one that only completes
      // the stream carries a null that is not a response
      if (!isUndefined(message.headers[KafkaHeaders.NEST_NO_RESPONSE])) {
        return { id, isDisposed: true };
      }
      return {
        id,
        response: message.value,
        isDisposed: true,
      };
    }
    return {
      id,
      response: message.value,
      isDisposed: false,
    };
  }
}
