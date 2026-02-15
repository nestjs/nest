import { IncomingEvent, IncomingRequest } from '../interfaces/index.js';
import { KafkaRequest } from '../serializers/kafka-request.serializer.js';
import { IncomingRequestDeserializer } from './incoming-request.deserializer.js';

/**
 * @publicApi
 */
export class KafkaRequestDeserializer extends IncomingRequestDeserializer {
  mapToSchema(
    data: KafkaRequest,
    options?: Record<string, any>,
  ): IncomingRequest | IncomingEvent {
    if (!options) {
      return {
        pattern: undefined,
        data: undefined,
      };
    }
    return {
      pattern: options.channel,
      data: data?.value ?? data,
    };
  }
}
