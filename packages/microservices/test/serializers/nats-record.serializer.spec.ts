import * as nats from '@nats-io/nats-core';
import { NatsRecordBuilder } from '../../record-builders/index.js';
import { NatsRecordSerializer } from '../../serializers/nats-record.serializer.js';

describe('NatsRecordSerializer', () => {
  let instance: NatsRecordSerializer;

  beforeEach(() => {
    instance = new NatsRecordSerializer();
  });
  describe('serialize', () => {
    it('undefined', () => {
      expect(instance.serialize({ data: undefined })).toEqual({
        headers: undefined,
        data: JSON.stringify({ data: undefined }),
      });
    });

    it('null', () => {
      expect(instance.serialize({ data: null })).toEqual({
        headers: undefined,
        data: JSON.stringify({ data: null }),
      });
    });

    it('string', () => {
      expect(instance.serialize({ data: 'string' })).toEqual({
        headers: undefined,
        data: JSON.stringify({ data: 'string' }),
      });
    });

    it('number', () => {
      expect(instance.serialize({ data: 12345 })).toEqual({
        headers: undefined,
        data: JSON.stringify({ data: 12345 }),
      });
    });

    it('buffer', () => {
      expect(instance.serialize({ data: Buffer.from('buffer') })).toEqual({
        headers: undefined,
        data: JSON.stringify({ data: Buffer.from('buffer') }),
      });
    });

    it('array', () => {
      expect(instance.serialize({ data: [1, 2, 3, 4, 5] })).toEqual({
        headers: undefined,
        data: JSON.stringify({ data: [1, 2, 3, 4, 5] }),
      });
    });

    it('object', () => {
      const serObject = { prop: 'value' };
      expect(instance.serialize({ data: serObject })).toEqual({
        headers: undefined,
        data: JSON.stringify({ data: serObject }),
      });
    });

    it('applies packet headers when data is not a NatsRecord', () => {
      const natsHeaders = nats.headers();
      natsHeaders.set('x-response', 'enabled');

      expect(
        instance.serialize({
          data: { value: 'string' },
          headers: natsHeaders,
        }),
      ).toEqual({
        headers: natsHeaders,
        data: JSON.stringify({
          data: {
            value: 'string',
          },
          headers: natsHeaders,
        }),
      });
    });

    it('nats message with data and nats headers', () => {
      const natsHeaders = nats.headers();
      natsHeaders.set('1', 'header_1');
      const natsMessage = new NatsRecordBuilder()
        .setHeaders(natsHeaders)
        .setData({ value: 'string' })
        .build();
      expect(
        instance.serialize({
          data: natsMessage,
        }),
      ).toEqual({
        headers: natsHeaders,
        data: JSON.stringify({
          data: {
            value: 'string',
          },
        }),
      });
    });

    it('should serialize an undefined packet without headers', () => {
      expect(instance.serialize(undefined)).toEqual({
        headers: undefined,
        data: JSON.stringify({}),
      });
    });
    it('should serialize a null packet without headers', () => {
      expect(instance.serialize(null)).toEqual({
        headers: undefined,
        data: JSON.stringify({ data: undefined }),
      });
    });
    describe('when the packet is a reply', () => {
      it('should unwrap the record in "response" and expose its headers, keeping "isDisposed" and "id"', () => {
        const natsHeaders = nats.headers();
        natsHeaders.set('x-response', 'enabled');
        const natsMessage = new NatsRecordBuilder({ value: 'string' })
          .setHeaders(natsHeaders)
          .build();

        expect(
          instance.serialize({
            response: natsMessage,
            isDisposed: true,
            id: '1',
          }),
        ).toEqual({
          headers: natsHeaders,
          data: JSON.stringify({
            response: { value: 'string' },
            isDisposed: true,
            id: '1',
          }),
        });
      });
      it('should not change the record it unwraps', () => {
        const natsHeaders = nats.headers();
        const natsMessage = new NatsRecordBuilder({ value: 'string' })
          .setHeaders(natsHeaders)
          .build();

        instance.serialize({ response: natsMessage, id: '1' });

        expect(natsMessage.data).toEqual({ value: 'string' });
        expect(natsMessage.headers).toBe(natsHeaders);
      });
      it('should act as an identity function if "response" is not an instance of NatsRecord class', () => {
        const packet = {
          response: { random: true },
          isDisposed: true,
          id: '1',
        };
        expect(instance.serialize(packet)).toEqual({
          headers: undefined,
          data: JSON.stringify(packet),
        });
      });
      it('should not unwrap a plain object that only looks like a record', () => {
        const packet = {
          response: { data: 'x', headers: { 'x-response': 'enabled' } },
          isDisposed: true,
        };
        expect(instance.serialize(packet)).toEqual({
          headers: undefined,
          data: JSON.stringify(packet),
        });
      });
    });
  });
});
