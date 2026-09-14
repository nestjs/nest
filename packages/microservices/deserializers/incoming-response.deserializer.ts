import { IncomingResponse, ProducerDeserializer } from '../interfaces/index.js';
import { isPlainObject, isUndefined } from '@nestjs/common/internal';

const NEST_RESPONSE_FIELDS = ['id', 'err', 'response', 'isDisposed', 'status'];

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
    if (!isPlainObject(value)) {
      return true;
    }
    const keys = Object.keys(value);
    const hasUnknownKeys = keys.some(
      key => !NEST_RESPONSE_FIELDS.includes(key),
    );
    if (hasUnknownKeys) {
      return true;
    }
    const hasInternalPayload =
      !isUndefined((value as IncomingResponse).err) ||
      !isUndefined((value as IncomingResponse).response) ||
      !isUndefined((value as IncomingResponse).isDisposed);

    if (!hasInternalPayload) {
      return true;
    }
    const hasCorrelationOrDisposal =
      !isUndefined((value as IncomingResponse).id) ||
      !isUndefined((value as IncomingResponse).isDisposed);

    return !hasCorrelationOrDisposal;
  }

  mapToSchema(value: any): IncomingResponse {
    return {
      id: value && value.id,
      response: value,
      isDisposed: true,
    };
  }
}
