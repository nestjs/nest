import {
  isNil,
  isObject,
  isPlainObject,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { MaxKafkaHeadersExceededException } from '../errors/max-kafka-headers-exceeded.exception';
import { Serializer } from '../interfaces/serializer.interface';

// kafkajs encodes each value of the headers (a repeated header has several)
// as a header of its own, at about 1 kB apiece
const MAX_HEADER_VALUES = 10_000;

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

    if (isNotKafkaMessage) {
      value = { value };
    }
    // A string or an array (as an echo handler may return them) would turn
    // each of its characters or items into a header
    if (!isObject(value.headers) || Array.isArray(value.headers)) {
      value.headers = {};
    }
    let headerValues = 0;
    for (const headerValue of Object.values(value.headers)) {
      headerValues += Array.isArray(headerValue) ? headerValue.length : 1;
    }
    if (headerValues > MAX_HEADER_VALUES) {
      throw new MaxKafkaHeadersExceededException(
        headerValues,
        MAX_HEADER_VALUES,
      );
    }
    value.value = this.encode(value.value);
    if (!isNil(value.key)) {
      value.key = this.encode(value.key);
    }
    return value;
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
