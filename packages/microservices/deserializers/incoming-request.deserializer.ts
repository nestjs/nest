import { isUndefined } from '@nestjs/common/utils/shared.utils';

import {
  ConsumerDeserializer,
  IncomingEvent,
  IncomingRequest,
} from '../interfaces';

export class IncomingRequestDeserializer implements ConsumerDeserializer {
  deserialize(
    value: any,
    options?: Record<string, any>,
  ): IncomingRequest | IncomingEvent {
    return this.isExternal(value) ? this.mapToSchema(value, options) : value;
  }

  isExternal(value: any): boolean {
    if (!value) {
      return true;
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
