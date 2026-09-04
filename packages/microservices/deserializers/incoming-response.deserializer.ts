import { IncomingResponse, ProducerDeserializer } from '../interfaces/index.js';
import { isUndefined } from '@nestjs/common/internal';

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
    if (!value) {
      return true;
    }
    // IncomingResponse = WritePacket & PacketId. A Nest envelope always
    // carries `id`. A foreign payload that merely contains `response` /
    // `err` / `isDisposed` (see nestjs/nest#17669) is not an envelope.
    const hasPacketId = !isUndefined((value as IncomingResponse).id);
    const looksLikeWritePacket =
      !isUndefined((value as IncomingResponse).err) ||
      !isUndefined((value as IncomingResponse).response) ||
      !isUndefined((value as IncomingResponse).isDisposed);
    if (hasPacketId && looksLikeWritePacket) {
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
