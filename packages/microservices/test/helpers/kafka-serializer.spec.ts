import { expect } from 'chai';
import { KafkaSerializer } from '../../helpers/kafka-serializer';
import { KafkaHeaders } from '../../enums/kafka-headers.enum';

describe('kafka serializer', () => {
  describe('serialize types', () => {
    it('undefined', () => {
      expect(KafkaSerializer.serialize(undefined)).to.deep.eq({
        headers: {},
        value: null
      });
    });

    it('null', () => {
      expect(KafkaSerializer.serialize(null)).to.deep.eq({
        headers: {},
        value: null
      });
    });

    it('string', () => {
      expect(KafkaSerializer.serialize('string')).to.deep.eq({
        headers: {},
        value: 'string'
      });
    });

    it('number', () => {
      expect(KafkaSerializer.serialize(12345)).to.deep.eq({
        headers: {},
        value: '12345'
      });
    });

    it('buffer', () => {
      expect(KafkaSerializer.serialize(Buffer.from('buffer'))).to.deep.eq({
        headers: {},
        value: Buffer.from('buffer')
      });
    });

    it('array', () => {
      expect(KafkaSerializer.serialize([1, 2, 3, 4, 5])).to.deep.eq({
        headers: {},
        value: '[1,2,3,4,5]'
      });
    });

    it('object', () => {
      expect(KafkaSerializer.serialize({
        prop: 'value'
      })).to.deep.eq({
        headers: {},
        value: '{"prop":"value"}'
      });
    });

    it('complex object with .toString()', () => {
      class Complex {
        private name = 'complex';
        public toString(): string {
          return this.name;
        }
      }

      expect(KafkaSerializer.serialize(new Complex())).to.deep.eq({
        headers: {},
        value: 'complex'
      });
    });

    it('complex object without .toString()', () => {
      class ComplexWithOutToString {
        private name = 'complex';
      }

      expect(KafkaSerializer.serialize(new ComplexWithOutToString())).to.deep.eq({
        headers: {},
        value: '[object Object]'
      });
    });
  });

  describe('serialize kafka message', () => {
    it('kafka message without key', () => {
      expect(KafkaSerializer.serialize({
        value: 'string'
      })).to.deep.eq({
        headers: {},
        value: 'string'
      });
    });

    it('kafka message with key', () => {
      expect(KafkaSerializer.serialize({
        key: '1',
        value: 'string'
      })).to.deep.eq({
        headers: {},
        key: '1',
        value: 'string'
      });
    });

    it('kafka message with headers', () => {
      expect(KafkaSerializer.serialize({
        key: '1',
        value: 'string',
        headers: {
          [KafkaHeaders.CORRELATION_ID]: '1234'
        }
      })).to.deep.eq({
        headers: {
          [KafkaHeaders.CORRELATION_ID]: '1234'
        },
        key: '1',
        value: 'string'
      });
    });
  });

  describe('deserialize', () => {
    it('undefined', () => {
      expect(KafkaSerializer.deserialize({
        value: undefined
      })).to.deep.eq({
        value: null
      });
    });

    it('null', () => {
      expect(KafkaSerializer.deserialize({
        value: null
      })).to.deep.eq({
        value: null
      });
    });

    it('buffer string', () => {
      expect(KafkaSerializer.deserialize({
        value: Buffer.from('string')
      })).to.deep.eq({
        value: 'string'
      });
    });

    it('buffer number', () => {
      expect(KafkaSerializer.deserialize({
        value: Buffer.from('12345')
      })).to.deep.eq({
        value: 12345
      });
    });

    it('buffer json', () => {
      expect(KafkaSerializer.deserialize({
        value: Buffer.from(JSON.stringify({prop: 'value'}))
      })).to.deep.eq({
        value: {
          prop: 'value'
        }
      });
    });

    it('buffer json with key', () => {
      expect(KafkaSerializer.deserialize({
        value: Buffer.from(JSON.stringify({prop: 'value'})),
        key: Buffer.from('1')
      })).to.deep.eq({
        key: 1,
        value: {
          prop: 'value'
        }
      });
    });
  });
});
