import {
  ConsumerDeserializer,
  IncomingEvent,
  IncomingRequest,
} from '../interfaces/index.js';
import { isUndefined } from '@nestjs/common/internal';

/**
 * @publicApi
 */
export class IncomingRequestDeserializer implements ConsumerDeserializer {
  deserialize(
    value: any,
    options?: Record<string, any>,
  ):
    | IncomingRequest
    | IncomingEvent
    | Promise<IncomingRequest | IncomingEvent> {
    return this.isExternal(value) ? this.mapToSchema(value, options) : value;
  }

  isExternal(value: any): boolean {
    if (!value) {
      return true;
    }
    // IncomingRequest = ReadPacket & PacketId. Every packet a Nest client
    // emits carries both `pattern` and `data` (isNil guards reject anything
    // else), so a foreign payload that merely includes one of these keys
    // (see nestjs/nest#17669 for the response-side twin) is not a packet.
    if (
      !isUndefined((value as IncomingRequest).pattern) &&
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
