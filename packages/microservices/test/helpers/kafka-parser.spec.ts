import { KafkaHeaders } from '../../enums/kafka-headers.enum.js';
import { MaxPacketLengthExceededException } from '../../errors/max-packet-length-exceeded.exception.js';
import { KafkaParser } from '../../helpers/kafka-parser.js';

describe('KafkaParser', () => {
  describe('parse', () => {
    let kafkaParser: any;

    beforeEach(() => {
      kafkaParser = new KafkaParser();
    });

    it('undefined', () => {
      expect(
        kafkaParser.parse({
          value: undefined,
        }),
      ).toEqual({
        headers: {},
        value: null,
      });
    });

    it('null', () => {
      expect(
        kafkaParser.parse({
          value: null,
        }),
      ).toEqual({
        headers: {},
        value: null,
      });
    });

    it('buffer string', () => {
      expect(
        kafkaParser.parse({
          value: Buffer.from('string'),
        }),
      ).toEqual({
        headers: {},
        value: 'string',
      });
    });

    it('binary buffer using kafka schema registry preamble', () => {
      const kafkaSchemaPreambleWithSchemaId = [0x00, 0x00, 0x00, 0x00, 0x01];
      expect(
        kafkaParser.parse({
          value: Buffer.from(kafkaSchemaPreambleWithSchemaId),
        }),
      ).toEqual({
        headers: {},
        value: Buffer.from(kafkaSchemaPreambleWithSchemaId),
      });
    });

    it('buffer number', () => {
      expect(
        kafkaParser.parse({
          value: Buffer.from('12345'),
        }),
      ).toEqual({
        headers: {},
        value: '12345',
      });
    });

    it('buffer bigint', () => {
      const long = '9007199254740992';

      expect(
        kafkaParser.parse({
          value: Buffer.from(long),
        }),
      ).toEqual({
        headers: {},
        value: long,
      });
    });

    it('buffer json', () => {
      expect(
        kafkaParser.parse({
          value: Buffer.from(JSON.stringify({ prop: 'value' })),
        }),
      ).toEqual({
        headers: {},
        value: {
          prop: 'value',
        },
      });
    });

    it('buffer json with key', () => {
      expect(
        kafkaParser.parse({
          value: Buffer.from(JSON.stringify({ prop: 'value' })),
          key: Buffer.from('1'),
        }),
      ).toEqual({
        headers: {},
        key: '1',
        value: {
          prop: 'value',
        },
      });
    });

    it('buffer json with key and headers', () => {
      expect(
        kafkaParser.parse({
          headers: {
            [KafkaHeaders.CORRELATION_ID]: Buffer.from('correlation-id'),
          },
          value: Buffer.from(JSON.stringify({ prop: 'value' })),
          key: Buffer.from('1'),
        }),
      ).toEqual({
        key: '1',
        value: {
          prop: 'value',
        },
        headers: {
          [KafkaHeaders.CORRELATION_ID]: 'correlation-id',
        },
      });
    });

    it('parse message multiple times (simulate retry)', () => {
      const message = {
        headers: {
          [KafkaHeaders.CORRELATION_ID]: Buffer.from('correlation-id'),
        },
        value: Buffer.from(JSON.stringify({ prop: 'value' })),
        key: Buffer.from('1'),
      };
      const expectedParsedMessage = {
        key: '1',
        value: {
          prop: 'value',
        },
        headers: {
          [KafkaHeaders.CORRELATION_ID]: 'correlation-id',
        },
      };
      expect(kafkaParser.parse(message)).toEqual(expectedParsedMessage);
      // Parse message again and verify it still works correctly
      expect(kafkaParser.parse(message)).toEqual(expectedParsedMessage);
      // Verify message was not modified
      expect(message).toEqual({
        headers: {
          [KafkaHeaders.CORRELATION_ID]: Buffer.from('correlation-id'),
        },
        value: Buffer.from(JSON.stringify({ prop: 'value' })),
        key: Buffer.from('1'),
      });
    });

    it('should decode the headers the transport routes replies with as text', () => {
      expect(
        kafkaParser.parse({
          headers: {
            [KafkaHeaders.CORRELATION_ID]: Buffer.from('{"length":200000000}'),
            [KafkaHeaders.REPLY_TOPIC]: Buffer.from('\0test.topic.reply'),
            [KafkaHeaders.REPLY_PARTITION]: Buffer.from('[0]'),
            custom: Buffer.from('{"prop":"value"}'),
          },
          value: null,
        }),
      ).toEqual({
        headers: {
          [KafkaHeaders.CORRELATION_ID]: '{"length":200000000}',
          [KafkaHeaders.REPLY_TOPIC]: '\0test.topic.reply',
          [KafkaHeaders.REPLY_PARTITION]: '[0]',
          custom: { prop: 'value' },
        },
        value: null,
      });
    });

    describe('when the message exceeds "maxMessageSize"', () => {
      beforeEach(() => {
        kafkaParser = new KafkaParser({ maxMessageSize: 16 });
      });

      it('should parse a message of exactly that size', () => {
        expect(
          kafkaParser.parse({
            key: Buffer.from('12'),
            headers: { custom: Buffer.from('34') },
            value: Buffer.from('[5678]'),
          }),
        ).toEqual({ key: '12', headers: { custom: '34' }, value: [5678] });
      });

      it('should throw on a large value', () => {
        expect(() =>
          kafkaParser.parse({ value: Buffer.alloc(17, '[') }),
        ).toThrow(MaxPacketLengthExceededException);
      });

      it('should throw on a large key', () => {
        expect(() =>
          kafkaParser.parse({ key: Buffer.alloc(17, '['), value: null }),
        ).toThrow(MaxPacketLengthExceededException);
      });

      it('should throw on many headers', () => {
        const headers = Object.fromEntries(
          [...'abcdefghijklmnopq'].map(name => [name, Buffer.alloc(0)]),
        );
        expect(() => kafkaParser.parse({ headers, value: null })).toThrow(
          MaxPacketLengthExceededException,
        );
      });

      it('should throw on a large repeated header', () => {
        expect(() =>
          kafkaParser.parse({
            headers: { custom: [Buffer.alloc(5, '['), Buffer.alloc(6, '[')] },
            value: null,
          }),
        ).toThrow(MaxPacketLengthExceededException);
      });

      it('should not count the value when "keepBinary" is set', () => {
        kafkaParser = new KafkaParser({ keepBinary: true, maxMessageSize: 16 });
        const value = Buffer.alloc(17, '[');
        expect(kafkaParser.parse({ value }).value).toBe(value);
      });
    });

    it('should limit the message size to 16 MiB by default', () => {
      // The limit is checked before anything is decoded
      const value = { length: 16 * 1024 * 1024 + 1 };
      expect(() => kafkaParser.parse({ value })).toThrow(
        MaxPacketLengthExceededException,
      );
    });
  });
});
