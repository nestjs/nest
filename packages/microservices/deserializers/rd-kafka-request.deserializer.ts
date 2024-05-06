import { IncomingEvent, IncomingRequest } from '../interfaces';
import { RdKafkaRequest } from '../serializers/rd-kafka-request.serializer';
import { IncomingRequestDeserializer } from './incoming-request.deserializer';

/**
 * @publicApi
 */
export class RdKafkaRequestDeserializer extends IncomingRequestDeserializer {
  mapToSchema(
    data: RdKafkaRequest,
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
