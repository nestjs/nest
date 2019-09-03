import {
  isNil,
  isObject,
  isPlainObject,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';

export class KafkaParser {
  public static parse<T = any>(data: any): T {
    data.value = this.decode(data.value);

    if (!isNil(data.key)) {
      data.key = this.decode(data.key);
    }
    if (!isNil(data.headers)) {
      const decodeHeaderByKey = (key: string) => {
        data.headers[key] = this.decode(data.headers[key]);
      };
      Object.keys(data.headers).forEach(decodeHeaderByKey);
    }
    return data;
  }

  public static decode(value: Buffer): object | string | null {
    if (isNil(value)) {
      return null;
    }

    let result = value.toString();
    const startChar = result.charAt(0);

    // only try to parse objects and arrays
    if (startChar === '{' || startChar === '[') {
      try {
        result = JSON.parse(value.toString());
      } catch (e) {}
    }
    return result;
  }

  public static stringify<T = any>(data: any): T {
    // wrap the packet in an a kafka message when data is not an object
    // when data is an object but key and value are undefined
    // then the user is not passing a kafka message
    const isNotKafkaMessage =
      isNil(data) ||
      !isObject(data) ||
      (!('key' in data) && !('value' in data));

    if (isNotKafkaMessage) {
      data = {
        value: data,
      };
    }

    data.value = this.encode(data.value);
    if (!isNil(data.key)) {
      data.key = this.encode(data.key);
    }
    if (isNil(data.headers)) {
      data.headers = {};
    }
    return data;
  }

  public static encode(value: any): Buffer | string | null {
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
}
