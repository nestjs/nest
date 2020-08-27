import { isNil } from '@nestjs/common/utils/shared.utils';

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
    } else {
      data.headers = {};
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
        return result;
      } catch (e) {}
    }
    return value;
  }
}
