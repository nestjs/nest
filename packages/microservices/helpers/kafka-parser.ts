import { isNil } from '@nestjs/common/utils/shared.utils';
import { KafkaParserConfig } from '../interfaces';

export class KafkaParser {
  protected readonly keepBinary: boolean;

  constructor(config?: KafkaParserConfig) {
    this.keepBinary = (config && config.keepBinary) || false;
  }

  public parse<T = any>(data: any): T {
    // Clone object to as modifying the original one would break KafkaJS retries
    const result = {
      ...data,
      headers: { ...data.headers },
    };

    if (!this.keepBinary) {
      result.value = this.decode(data.value);
    }

    if (!isNil(data.key)) {
      result.key = this.decode(data.key);
    }
    if (!isNil(data.headers)) {
      const decodeHeaderByKey = (key: string) => {
        result.headers[key] = this.decode(data.headers[key]);
      };
      Object.keys(data.headers).forEach(decodeHeaderByKey);
    } else {
      result.headers = {};
    }
    return result;
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

    // Only try to parse objects and arrays
    if (startChar === '{' || startChar === '[') {
      try {
        result = JSON.parse(value.toString());
      } catch (e) {
        // Do nothing
      }
    }
    return result;
  }
}
