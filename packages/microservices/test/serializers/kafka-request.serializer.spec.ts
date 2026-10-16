import { expect } from 'chai';
import { KafkaHeaders } from '../../enums/kafka-headers.enum';
import { KafkaRequestSerializer } from '../../serializers/kafka-request.serializer';

describe('KafkaRequestSerializer', () => {
  let instance: KafkaRequestSerializer;
  beforeEach(() => {
    instance = new KafkaRequestSerializer();
  });
  describe('serialize', () => {
    it('undefined', async () => {
      expect(await instance.serialize(undefined)).to.deep.eq({
        headers: {},
        value: null,
      });
    });

    it('null', async () => {
      expect(await instance.serialize(null)).to.deep.eq({
        headers: {},
        value: null,
      });
    });

    it('string', async () => {
      expect(await instance.serialize('string')).to.deep.eq({
        headers: {},
        value: 'string',
      });
    });

    it('number', async () => {
      expect(await instance.serialize(12345)).to.deep.eq({
        headers: {},
        value: '12345',
      });
    });

    it('buffer', async () => {
      expect(await instance.serialize(Buffer.from('buffer'))).to.deep.eq({
        headers: {},
        value: Buffer.from('buffer'),
      });
    });

    it('array', async () => {
      expect(await instance.serialize([1, 2, 3, 4, 5])).to.deep.eq({
        headers: {},
        value: '[1,2,3,4,5]',
      });
    });

    it('object', async () => {
      expect(
        await instance.serialize({
          prop: 'value',
        }),
      ).to.deep.eq({
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

      expect(await instance.serialize(new Complex())).to.deep.eq({
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

      expect(await instance.serialize(new ComplexChild())).to.deep.eq({
        headers: {},
        value: 'complexParent',
      });
    });

    it('complex object without .toString()', async () => {
      class ComplexWithOutToString {
        private readonly name = 'complex';
      }

      expect(await instance.serialize(new ComplexWithOutToString())).to.deep.eq(
        {
          headers: {},
          value: '{"name":"complex"}',
        },
      );
    });
  });

  describe('serialize a kafka message whose headers are not an object', () => {
    // An echo handler returns them as the sender of the request chose them
    (
      [
        ['a string', 'AAAA'],
        ['an array', ['A', 'A']],
        ['a number', 1234],
        ['null', null],
      ] as const
    ).forEach(([description, headers]) => {
      it(`should send no headers if they are ${description}`, async () => {
        expect(await instance.serialize({ value: 'x', headers })).to.deep.equal(
          {
            value: 'x',
            headers: {},
          },
        );
      });
    });

    it('should send the headers of a class instance', async () => {
      class Headers {
        tenant = 'custom';
      }

      const serialized = await instance.serialize({
        value: 'x',
        headers: new Headers(),
      });
      expect({ ...serialized.headers }).to.deep.equal({ tenant: 'custom' });
    });
  });

  describe('serialize kafka message', () => {
    it('kafka message without key', async () => {
      expect(
        await instance.serialize({
          value: 'string',
        }),
      ).to.deep.eq({
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
      ).to.deep.eq({
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
