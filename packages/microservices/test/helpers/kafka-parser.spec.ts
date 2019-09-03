import { expect } from 'chai';
import { KafkaHeaders } from '../../enums/kafka-headers.enum';
import { KafkaParser } from '../../helpers/kafka-parser';

describe('KafkaParser', () => {
  describe('parse', () => {
    it('undefined', () => {
      expect(
        KafkaParser.parse({
          value: undefined,
        }),
      ).to.deep.eq({
        value: null,
      });
    });

    it('null', () => {
      expect(
        KafkaParser.parse({
          value: null,
        }),
      ).to.deep.eq({
        value: null,
      });
    });

    it('buffer string', () => {
      expect(
        KafkaParser.parse({
          value: Buffer.from('string'),
        }),
      ).to.deep.eq({
        value: 'string',
      });
    });

    it('buffer number', () => {
      expect(
        KafkaParser.parse({
          value: Buffer.from('12345'),
        }),
      ).to.deep.eq({
        value: '12345',
      });
    });

    it('buffer bigint', () => {
      const long = '9007199254740992';

      expect(
        KafkaParser.parse({
          value: Buffer.from(long),
        }),
      ).to.deep.eq({
        value: long,
      });
    });

    it('buffer json', () => {
      expect(
        KafkaParser.parse({
          value: Buffer.from(JSON.stringify({ prop: 'value' })),
        }),
      ).to.deep.eq({
        value: {
          prop: 'value',
        },
      });
    });

    it('buffer json with key', () => {
      expect(
        KafkaParser.parse({
          value: Buffer.from(JSON.stringify({ prop: 'value' })),
          key: Buffer.from('1'),
        }),
      ).to.deep.eq({
        key: '1',
        value: {
          prop: 'value',
        },
      });
    });

    it('buffer json with key and headers', () => {
      expect(
        KafkaParser.parse({
          headers: {
            [KafkaHeaders.CORRELATION_ID]: Buffer.from('correlation-id'),
          },
          value: Buffer.from(JSON.stringify({ prop: 'value' })),
          key: Buffer.from('1'),
        }),
      ).to.deep.eq({
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

  describe('stringify', () => {
    it('undefined', () => {
      expect(KafkaParser.stringify(undefined)).to.deep.eq({
        headers: {},
        value: null,
      });
    });

    it('null', () => {
      expect(KafkaParser.stringify(null)).to.deep.eq({
        headers: {},
        value: null,
      });
    });

    it('string', () => {
      expect(KafkaParser.stringify('string')).to.deep.eq({
        headers: {},
        value: 'string',
      });
    });

    it('number', () => {
      expect(KafkaParser.stringify(12345)).to.deep.eq({
        headers: {},
        value: '12345',
      });
    });

    it('buffer', () => {
      expect(KafkaParser.stringify(Buffer.from('buffer'))).to.deep.eq({
        headers: {},
        value: Buffer.from('buffer'),
      });
    });

    it('array', () => {
      expect(KafkaParser.stringify([1, 2, 3, 4, 5])).to.deep.eq({
        headers: {},
        value: '[1,2,3,4,5]',
      });
    });

    it('object', () => {
      expect(
        KafkaParser.stringify({
          prop: 'value',
        }),
      ).to.deep.eq({
        headers: {},
        value: '{"prop":"value"}',
      });
    });

    it('complex object with .toString()', () => {
      class Complex {
        private name = 'complex';
        public toString(): string {
          return this.name;
        }
      }

      expect(KafkaParser.stringify(new Complex())).to.deep.eq({
        headers: {},
        value: 'complex',
      });
    });

    it('complex object without .toString()', () => {
      class ComplexWithOutToString {
        private name = 'complex';
      }

      expect(KafkaParser.stringify(new ComplexWithOutToString())).to.deep.eq({
        headers: {},
        value: '[object Object]',
      });
    });
  });

  describe('stringify kafka message', () => {
    it('kafka message without key', () => {
      expect(
        KafkaParser.stringify({
          value: 'string',
        }),
      ).to.deep.eq({
        headers: {},
        value: 'string',
      });
    });

    it('kafka message with key', () => {
      expect(
        KafkaParser.stringify({
          key: '1',
          value: 'string',
        }),
      ).to.deep.eq({
        headers: {},
        key: '1',
        value: 'string',
      });
    });

    it('kafka message with headers', () => {
      expect(
        KafkaParser.stringify({
          key: '1',
          value: 'string',
          headers: {
            [KafkaHeaders.CORRELATION_ID]: '1234',
          },
        }),
      ).to.deep.eq({
        headers: {
          [KafkaHeaders.CORRELATION_ID]: '1234',
        },
        key: '1',
        value: 'string',
      });
    });
  });
});
