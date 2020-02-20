import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { KafkaHeaders } from '../enums/kafka-headers.enum';
import { Deserializer, IncomingResponse } from '../interfaces';

export class KafkaResponseDeserializer
  implements Deserializer<any, IncomingResponse> {
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
