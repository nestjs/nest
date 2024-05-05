import {
  isNil,
  isObject,
  isPlainObject,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { Serializer } from '../interfaces/serializer.interface';

export interface RdKafkaRequest<T = any> {
  key: Buffer | string | null;
  value: T;
  headers: Record<string, any>;
}

/**
 * @publicApi
 */
export class RdKafkaRequestSerializer
  implements Serializer<any, RdKafkaRequest | Promise<RdKafkaRequest>>
{
  public serialize(value: any) {
    const isNotKafkaMessage =
      isNil(value) ||
      !isObject(value) ||
      (!('key' in value) && !('value' in value));

    if (isNotKafkaMessage) {
      value = { value };
    }
    value.value = this.encode(value.value);
    if (!isNil(value.key)) {
      value.key = this.encode(value.key);
    }
    if (isNil(value.headers)) {
      value.headers = {};
    }
    return value;
  }

  public encode(value: any): Buffer | string | null {
    const isObjectOrArray =
      !isNil(value) && !isString(value) && !Buffer.isBuffer(value);

    if (isObjectOrArray) {
      return isPlainObject(value) || Array.isArray(value)
        ? JSON.stringify(value)
        : value.toString();
    } else if (isUndefined(value)) {
      return null;
    }
    return value;
  }

  // public encode(value: any): Buffer | null {
  //   const isObjectOrArray =
  //     !isNil(value) && !isString(value) && !Buffer.isBuffer(value);

  //   if (isObjectOrArray) {
  //     return isPlainObject(value) || Array.isArray(value)
  //       ? Buffer.from(JSON.stringify(value))
  //       : Buffer.from(value.toString());
  //   } else if (isUndefined(value)) {
  //     return null;
  //   }
  //   return Buffer.from(value);
  // }
}
