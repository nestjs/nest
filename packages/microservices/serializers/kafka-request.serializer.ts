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
  serialize(value: any): any {
    const isNotKafkaMessage =
      isNil(value) ||
      !isObject(value) ||
      (!('key' in value) && !('value' in value));

    // Serialize a copy, headers included: ClientKafka and ServerKafka write
    // correlation metadata into the returned headers, and the caller's record
    // may be frozen, reused or sent concurrently.
    const record = (isNotKafkaMessage ? { value } : value) as KafkaRequest;
    const request: KafkaRequest = { ...record, headers: { ...record.headers } };

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
