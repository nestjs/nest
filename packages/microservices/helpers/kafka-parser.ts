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

  public static decode(value: Buffer): object | string | null | Buffer {
    if (isNil(value)) {
      return null;
    }

    // a value with leading zero byte indicates a schema payload.
    // The content is possibly binary and should not be touched.
    if (
      Buffer.isBuffer(value) &&
      value.length > 0 &&
      value.readUInt8(0) === 0
    ) {
      return value;
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
}
