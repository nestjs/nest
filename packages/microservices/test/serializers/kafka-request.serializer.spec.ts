import { expect } from 'chai';
import { KafkaHeaders } from '../../enums/kafka-headers.enum';
import { KafkaRequestSerializer } from '../../serializers/kafka-request.serializer';

describe('KafkaRequestSerializer', () => {
  let instance: KafkaRequestSerializer;
  beforeEach(() => {
    instance = new KafkaRequestSerializer();
  });
  describe('serialize', () => {
    it('undefined', () => {
      expect(instance.serialize(undefined)).to.deep.eq({
        headers: {},
        value: null,
      });
    });

    it('null', () => {
      expect(instance.serialize(null)).to.deep.eq({
        headers: {},
        value: null,
      });
    });

    it('string', () => {
      expect(instance.serialize('string')).to.deep.eq({
        headers: {},
        value: 'string',
      });
    });

    it('number', () => {
      expect(instance.serialize(12345)).to.deep.eq({
        headers: {},
        value: '12345',
      });
    });

    it('buffer', () => {
      expect(instance.serialize(Buffer.from('buffer'))).to.deep.eq({
        headers: {},
        value: Buffer.from('buffer'),
      });
    });

    it('array', () => {
      expect(instance.serialize([1, 2, 3, 4, 5])).to.deep.eq({
        headers: {},
        value: '[1,2,3,4,5]',
      });
    });

    it('object', () => {
      expect(
        instance.serialize({
          prop: 'value',
        }),
      ).to.deep.eq({
        headers: {},
        value: '{"prop":"value"}',
      });
    });

    it('complex object with .toString()', () => {
      class Complex {
        private readonly name = 'complex';
        public toString(): string {
          return this.name;
        }
      }

      expect(instance.serialize(new Complex())).to.deep.eq({
        headers: {},
        value: 'complex',
      });
    });

    it('complex object without .toString()', () => {
      class ComplexWithOutToString {
        private readonly name = 'complex';
      }

      expect(instance.serialize(new ComplexWithOutToString())).to.deep.eq({
        headers: {},
        value: '[object Object]',
      });
    });
  });

  describe('serialize kafka message', () => {
    it('kafka message without key', () => {
      expect(
        instance.serialize({
          value: 'string',
        }),
      ).to.deep.eq({
        headers: {},
        value: 'string',
      });
    });

    it('kafka message with key', () => {
      expect(
        instance.serialize({
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
        instance.serialize({
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
