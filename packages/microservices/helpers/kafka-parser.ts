import { isNil } from '@nestjs/common/utils/shared.utils';
import { KafkaParserConfig } from '../interfaces';

export class KafkaParser {
  protected readonly keepBinary: boolean;

  constructor(config?: KafkaParserConfig) {
    this.keepBinary = (config && config.keepBinary) || false;
  }

  public parse<T = any>(data: any): T {
    if (!this.keepBinary) {
      data.value = this.decode(data.value);
    }

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

  public decode(value: Buffer): object | string | null | Buffer {
    if (isNil(value)) {
      return null;
    }
    // A value with the "leading zero byte" indicates the schema payload.
    // The "content" is possibly binary and should not be touched & parsed.
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
