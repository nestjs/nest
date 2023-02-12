import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { IncomingResponse, ProducerDeserializer } from '../interfaces';

/**
 * @publicApi
 */
export class IncomingResponseDeserializer implements ProducerDeserializer {
  deserialize(value: any, options?: Record<string, any>): IncomingResponse {
    return this.isExternal(value) ? this.mapToSchema(value) : value;
  }

  isExternal(value: any): boolean {
    if (!value) {
      return true;
    }
    if (
      !isUndefined((value as IncomingResponse).err) ||
      !isUndefined((value as IncomingResponse).response) ||
      !isUndefined((value as IncomingResponse).isDisposed)
    ) {
      return false;
    }
    return true;
  }

  mapToSchema(value: any): IncomingResponse {
    return {
      id: value && value.id,
      response: value,
      isDisposed: true,
    };
  }
}
