import { KafkaHeaders } from '../../enums/kafka-headers.enum';
import { KafkaParser } from '../../helpers/kafka-parser';

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
  });
});
