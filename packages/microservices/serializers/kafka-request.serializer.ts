import { Serializer } from '../interfaces/serializer.interface.js';
import {
  isNil,
  isObject,
  isPlainObject,
  isString,
  isUndefined,
} from '@nestjs/common/internal';

export interface KafkaRequest<T = any> {
  key: Buffer | string | null;
  value: T;
  headers: Record<string, any>;
}

/**
 * @publicApi
 */
export class KafkaRequestSerializer implements Serializer<
  any,
  KafkaRequest | Promise<KafkaRequest>
> {
  serialize(value: any) {
    const isNotKafkaMessage =
      isNil(value) ||
      !isObject(value) ||
      (!('key' in value) && !('value' in value));

    let request: KafkaRequest;
    if (isNotKafkaMessage) {
      request = { value, headers: {} };
    } else {
      // The record is cloned, headers included, so that the encoding below
      // and the correlation metadata ClientKafka writes into the headers of
      // the serialized packet do not mutate the record the caller passed in
      // (which it may reuse or retry).
      request = {
        ...value,
        headers: isNil(value.headers) ? {} : { ...value.headers },
      };
    }
    request.value = this.encode(request.value);
    if (!isNil(request.key)) {
      request.key = this.encode(request.key);
    }
    return request;
  }

  public encode(value: any): Buffer | string | null {
    const isObjectOrArray =
      !isNil(value) && !isString(value) && !Buffer.isBuffer(value);

    if (isObjectOrArray) {
      return isPlainObject(value) ||
        Array.isArray(value) ||
        value.toString == Object.prototype.toString // Prevent default [object Object] behavior
        ? JSON.stringify(value)
        : value.toString();
    } else if (isUndefined(value)) {
      return null;
    }
    return value;
  }
}
