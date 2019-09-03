import { isUndefined, isNil, isObject, isString, isPlainObject } from '@nestjs/common/utils/shared.utils';

export class KafkaParser {
  public static parse<T = any>(data: any): T {
    // parse the value
    data.value = this.decode(data.value);

    // parse the key
    if (!isNil(data.key)) {
      data.key = this.decode(data.key);
    }

    // parse the headers
    if (!isNil(data.headers)) {
      Object.keys(data.headers).forEach((key) => {
        data.headers[key] = this.decode(data.headers[key]);
      });
    }

    return data;
  }

  public static decode(value: Buffer): object | string | null {
    // when undefined or null then just return null
    if (isNil(value)) {
      return null;
    }

    // convert to string
    let result = value.toString();
    const startChar = result.charAt(0);

    // only try to parse objects and arrays
    if (startChar === '{' || startChar === '[') {
      try {
        result = JSON.parse(value.toString());
      } catch (e){}
    }

    return result;
  }

  public static stringify<T = any>(data: any): T {
    // wrap the packet in an a kafka message when data is not an object
    // when data is an object but key and value are undefined, then the user is not passing a kafka message
    if (isNil(data) || !isObject(data) || ((!('key' in data)) && (!('value' in data)))) {
      data = {
        value: data
      };
    }

    // make sure the value is a buffer or string
    data.value = this.encode(data.value);

    // make sure that if there is a key then it is a buffer or a string
    if (!isNil(data.key)) {
      data.key = this.encode(data.key);
    }

    // create headers if they don't exist
    if (isNil(data.headers)){
      data.headers = {};
    }

    return data;
  }

  public static encode(value: any): Buffer | string | null {
    if (!isNil(value) && !isString(value) && !Buffer.isBuffer(value)) {
      if (isPlainObject(value) || Array.isArray(value)) {
        // convert to stringified object
        return JSON.stringify(value);
      }

      // convert to string
      return value.toString();
    } else if (isUndefined(value)) {
      return null;
    }

    // return the value and hope for the best by default
    return value;
  }
}
