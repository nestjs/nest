import { isUndefined, isNil, isObject, isString, isFunction } from '@nestjs/common/utils/shared.utils';

export default class KafkaSerializer {
  public static deserialize<T>(data: any): T {
    // parse the value
    data.value = this.decode(data.value);

    // parse the key
    if (!isNil(data.key)) {
      data.key = this.decode(data.key);
    }

    return data;
  }

  public static decode(value: Buffer): object | string {
    if (!isNil(value)) {
      // convert to string
      let result = value.toString();

      // type to parse
      try {
        result = JSON.parse(result);
      } catch (e){}

      return result;
    }
  }

  public static serialize<T>(data: any): T {
    // wrap the packet in an a kafka message when data is not an object
    // when data is an object but key and value are undefined, then the user is not passing a kafka message
    if ((isUndefined(data.key) && isUndefined(data.value)) || !isObject(data)) {
      data = {
        value: data
      };
    }

    // make sure the value is a buffer or string
    data.value = this.encode(data.value);

    // make sure that if there is a ket then it is a buffer or a string
    if (!isNil(data.key)) {
      data.key = this.encode(data.key);
    }

    // create headers if they don't exist
    if (isUndefined(data.headers)){
      data.headers = {};
    }

    return data;
  }

  public static encode(value: any): string {
    if (!isNil(value) && !isString(value) && !Buffer.isBuffer(value)) {
      if (isObject(value) || Array.isArray(value)) {
        // convert to stringified object
        return JSON.stringify(value);
      } else if (isFunction(value.toString)) {
        // convert to string
        return value.toString();
      }
    }

    // return the value and hope for the best by default
    return value;
  }
}
