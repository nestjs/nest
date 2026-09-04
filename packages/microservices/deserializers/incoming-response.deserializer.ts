import { IncomingResponse, ProducerDeserializer } from '../interfaces/index.js';

/**
 * The only keys a Nest packet can carry. `status` is set by the
 * "no handler" packet emitted by RabbitMQ.
 */
const ENVELOPE_KEYS = new Set([
  'id',
  'err',
  'response',
  'isDisposed',
  'status',
]);

/**
 * @publicApi
 */
export class IncomingResponseDeserializer implements ProducerDeserializer {
  deserialize(
    value: any,
    options?: Record<string, any>,
  ): IncomingResponse | Promise<IncomingResponse> {
    return this.isExternal(value) ? this.mapToSchema(value) : value;
  }

  isExternal(value: any): boolean {
    if (!value || typeof value !== 'object') {
      return true;
    }
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return true;
    }
    // Nest packets never carry extra keys, unlike a foreign payload that
    // happens to contain `response` / `err` / `isDisposed`.
    return keys.some(key => !ENVELOPE_KEYS.has(key));
  }

  mapToSchema(value: any): IncomingResponse {
    return {
      id: value && value.id,
      response: value,
      isDisposed: true,
    };
  }
}
