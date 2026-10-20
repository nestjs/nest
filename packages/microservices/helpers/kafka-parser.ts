import { KafkaHeaders } from '../enums/kafka-headers.enum.js';
import { MaxPacketLengthExceededException } from '../errors/max-packet-length-exceeded.exception.js';
import { KafkaParserConfig } from '../interfaces/index.js';
import { isNil } from '@nestjs/common/internal';

const DEFAULT_MAX_MESSAGE_SIZE = 16 * 1024 * 1024; // 16 MiB
// The headers replies are routed with are text. Decoded like the others,
// the sender of a message could make them an object, an array or a Buffer.
const TRANSPORT_HEADERS: string[] = [
  KafkaHeaders.CORRELATION_ID,
  KafkaHeaders.REPLY_TOPIC,
  KafkaHeaders.REPLY_PARTITION,
];

export class KafkaParser {
  protected readonly keepBinary: boolean;
  protected readonly maxMessageSize: number;

  constructor(config?: KafkaParserConfig) {
    this.keepBinary = (config && config.keepBinary) || false;
    this.maxMessageSize = config?.maxMessageSize ?? DEFAULT_MAX_MESSAGE_SIZE;
  }

  public parse<T = any>(data: any): T {
    // kafkajs inflates a compressed batch without any limit, so the size of a
    // message on the wire does not bound the size of what is decoded here
    const messageSize = this.getMessageSize(data);
    if (messageSize > this.maxMessageSize) {
      throw new MaxPacketLengthExceededException(messageSize);
    }

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
      for (const key of Object.keys(data.headers)) {
        result.headers[key] = TRANSPORT_HEADERS.includes(key)
          ? this.decodeAsString(data.headers[key])
          : this.decode(data.headers[key]);
      }
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
        result = JSON.parse(result);
      } catch (e) {
        // Do nothing
      }
    }
    return result;
  }

  protected decodeAsString(value: Buffer): string | null {
    return isNil(value) ? null : value.toString();
  }

  protected getMessageSize(data: any): number {
    let size =
      (data.key?.length ?? 0) +
      (this.keepBinary ? 0 : (data.value?.length ?? 0));
    for (const [name, value] of Object.entries(data.headers ?? {})) {
      // kafkajs collects the values of a repeated header in an array
      const values: any[] = Array.isArray(value) ? value : [value];
      size += name.length;
      for (const headerValue of values) {
        size += headerValue?.length ?? 0;
      }
    }
    return size;
  }
}
