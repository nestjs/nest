import {
  ConsumerDeserializer,
  IncomingEvent,
  IncomingRequest,
} from '../interfaces/index.js';
import { isUndefined } from '@nestjs/common/internal';

/**
 * The only keys a Nest request or event packet can carry.
 */
const REQUEST_ENVELOPE_KEYS = new Set(['id', 'pattern', 'data']);

/**
 * @publicApi
 */
export interface IncomingRequestDeserializerOptions {
  /**
   * Treat a packet as a foreign message when it carries any key outside
   * the request envelope (`id`, `pattern`, `data`). The legacy gate passes
   * packets through as soon as they carry a `pattern` or a `data` key,
   * which lets foreign payloads that happen to carry a top-level `data`
   * key reach handlers unmodified.
   */
  strictRequestEnvelope?: boolean;
}

/**
 * @publicApi
 */
export class IncomingRequestDeserializer implements ConsumerDeserializer {
  protected options?: IncomingRequestDeserializerOptions;

  constructor(options?: IncomingRequestDeserializerOptions) {
    this.options = options;
  }

  deserialize(
    value: any,
    options?: Record<string, any>,
  ):
    IncomingRequest | IncomingEvent | Promise<IncomingRequest | IncomingEvent> {
    return this.isExternal(value) ? this.mapToSchema(value, options) : value;
  }

  isExternal(value: any): boolean {
    if (!value) {
      return true;
    }
    if (this.options?.strictRequestEnvelope === true) {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return true;
      }
      // Nest packets never carry extra keys, unlike a foreign payload
      // that happens to contain `data` alongside its own keys.
      return keys.some(key => !REQUEST_ENVELOPE_KEYS.has(key));
    }
    if (
      !isUndefined((value as IncomingRequest).pattern) ||
      !isUndefined((value as IncomingRequest).data)
    ) {
      return false;
    }
    return true;
  }

  mapToSchema(
    value: any,
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
      data: value,
    };
  }
}
