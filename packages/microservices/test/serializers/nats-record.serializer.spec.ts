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
  });
});
