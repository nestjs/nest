import {
  isNil,
  isObject,
  isPlainObject,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { Serializer } from '../interfaces/serializer.interface';
import { MessageHeaderList } from '../external/rd-kafka.interface';

export interface RdKafkaRequest<T = any> {
  key: Buffer | null;
  value: T;
  headers: MessageHeaderList
}

/**
 * @publicApi
 */
export class RdKafkaRequestSerializer
  implements Serializer<any, RdKafkaRequest | Promise<RdKafkaRequest>>
{
  public serialize(value) {
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
    } else {
      value.key = null;
    }

    if (isNil(value.headers)) {
      value.headers = [];
    } else if (isObject(value.headers)) {
      // header collections need to go from an object to an array of objects
      value.headers = Object.keys(value.headers).map((key) => {
        return {
          [key]: this.encode(value.headers[key])
        };
      });
    } else if (Array.isArray(value.headers)) {
      // encode the headers
      value.headers = value.headers.map((header) => {
        // always use the first key in the object
        return {
          [Object.keys(header)[0]]: this.encode(header[Object.keys(header)[0]])
        };
      });
    }

    return value;
  }

  public encode(value: any): Buffer | null {
    // short circuit if value is already a buffer
    if (Buffer.isBuffer(value)) {
      return value;
    }

    const isObjectOrArray =
      !isNil(value) && !isString(value) && !Buffer.isBuffer(value);

    if (isObjectOrArray) {
      if (isPlainObject(value) || Array.isArray(value)) {
        return Buffer.from(JSON.stringify(value));
      }
      
      return Buffer.from(value.toString());
    } else if (isUndefined(value)) {
      return null;
    }

    return Buffer.from(value);
  }
}
