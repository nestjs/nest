import { KafkaHeaders } from '../../enums/kafka-headers.enum.js';
import { KafkaRequestSerializer } from '../../serializers/kafka-request.serializer.js';

describe('KafkaRequestSerializer', () => {
  let instance: KafkaRequestSerializer;
  beforeEach(() => {
    instance = new KafkaRequestSerializer();
  });
  describe('serialize', () => {
    it('undefined', async () => {
      expect(await instance.serialize(undefined)).toEqual({
        headers: {},
        value: null,
      });
    });

    it('null', async () => {
      expect(await instance.serialize(null)).toEqual({
        headers: {},
        value: null,
      });
    });

    it('string', async () => {
      expect(await instance.serialize('string')).toEqual({
        headers: {},
        value: 'string',
      });
    });

    it('number', async () => {
      expect(await instance.serialize(12345)).toEqual({
        headers: {},
        value: '12345',
      });
    });

    it('buffer', async () => {
      expect(await instance.serialize(Buffer.from('buffer'))).toEqual({
        headers: {},
        value: Buffer.from('buffer'),
      });
    });

    it('array', async () => {
      expect(await instance.serialize([1, 2, 3, 4, 5])).toEqual({
        headers: {},
        value: '[1,2,3,4,5]',
      });
    });

    it('object', async () => {
      expect(
        await instance.serialize({
          prop: 'value',
        }),
      ).toEqual({
        headers: {},
        value: '{"prop":"value"}',
      });
    });

    it('complex object with .toString()', async () => {
      class Complex {
        private readonly name = 'complex';
        public toString(): string {
          return this.name;
        }
      }

      expect(await instance.serialize(new Complex())).toEqual({
        headers: {},
        value: 'complex',
      });
    });

    it('complex object with inherited .toString()', async () => {
      class ComplexParent {
        private readonly name = 'complexParent';
        public toString(): string {
          return this.name;
        }
      }

      class ComplexChild extends ComplexParent {}

      expect(await instance.serialize(new ComplexChild())).toEqual({
        headers: {},
        value: 'complexParent',
      });
    });

    it('complex object without .toString()', async () => {
      class ComplexWithOutToString {
        private readonly name = 'complex';
      }

      expect(await instance.serialize(new ComplexWithOutToString())).toEqual({
        headers: {},
        value: '{"name":"complex"}',
      });
    });
  });

  describe('serialize kafka message', () => {
    it('kafka message without key', async () => {
      expect(
        await instance.serialize({
          value: 'string',
        }),
      ).toEqual({
        headers: {},
        value: 'string',
      });
    });

    it('kafka message with key', async () => {
      expect(
        await instance.serialize({
          key: '1',
          value: 'string',
        }),
      ).toEqual({
        headers: {},
        key: '1',
        value: 'string',
      });
    });

    it('kafka message with headers', async () => {
      expect(
        await instance.serialize({
          key: '1',
          value: 'string',
          headers: {
            [KafkaHeaders.CORRELATION_ID]: '1234',
          },
        }),
      ).toEqual({
        headers: {
          [KafkaHeaders.CORRELATION_ID]: '1234',
        },
        key: '1',
        value: 'string',
      });
    });
  });

  describe('serialize without mutating the caller record', () => {
    it('should not mutate the record passed in', async () => {
      const record = {
        key: '1',
        value: { price: 100 },
        headers: { tenant: 'custom' },
      };

      const result = await instance.serialize(record);

      expect(result).not.toBe(record);
      expect(result.headers).not.toBe(record.headers);
      expect(result).toEqual({
        key: '1',
        value: '{"price":100}',
        headers: { tenant: 'custom' },
      });
      expect(record).toEqual({
        key: '1',
        value: { price: 100 },
        headers: { tenant: 'custom' },
      });
    });

    it('should not mutate a record whose headers are not set', async () => {
      const record = { value: { price: 100 } };

      const result = await instance.serialize(record);

      expect(record).toEqual({ value: { price: 100 } });
      expect(result).toEqual({ value: '{"price":100}', headers: {} });
    });

    it('should hand back headers the client can safely extend', async () => {
      const headers = { tenant: 'custom' };
      const record = { value: 'string', headers };

      const result = await instance.serialize(record);
      // ClientKafka adds correlation metadata to the serialized
      // packet's headers once serialization is done.
      result.headers[KafkaHeaders.CORRELATION_ID] = '1234';

      expect(headers).toEqual({ tenant: 'custom' });
    });
  });
});
