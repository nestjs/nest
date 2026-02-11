import * as nats from 'nats';
import { NatsRecordBuilder } from '../../record-builders/index.js';
import { NatsRecordSerializer } from '../../serializers/nats-record.serializer.js';

const jsonCodec = nats.JSONCodec();

describe('NatsRecordSerializer', () => {
  let instance: NatsRecordSerializer;
  beforeEach(() => {
    instance = new NatsRecordSerializer();
  });
  describe('serialize', () => {
    it('undefined', async () => {
      expect(await instance.serialize({ data: undefined })).toEqual({
        headers: undefined,
        data: jsonCodec.encode({ data: undefined }),
      });
    });

    it('null', async () => {
      expect(await instance.serialize({ data: null })).toEqual({
        headers: undefined,
        data: jsonCodec.encode({ data: null }),
      });
    });

    it('string', async () => {
      expect(await instance.serialize({ data: 'string' })).toEqual({
        headers: undefined,
        data: jsonCodec.encode({ data: 'string' }),
      });
    });

    it('number', async () => {
      expect(await instance.serialize({ data: 12345 })).toEqual({
        headers: undefined,
        data: jsonCodec.encode({ data: 12345 }),
      });
    });

    it('buffer', async () => {
      expect(await instance.serialize({ data: Buffer.from('buffer') })).toEqual(
        {
          headers: undefined,
          data: jsonCodec.encode({ data: Buffer.from('buffer') }),
        },
      );
    });

    it('array', async () => {
      expect(await instance.serialize({ data: [1, 2, 3, 4, 5] })).toEqual({
        headers: undefined,
        data: jsonCodec.encode({ data: [1, 2, 3, 4, 5] }),
      });
    });

    it('object', async () => {
      const serObject = { prop: 'value' };
      expect(await instance.serialize({ data: serObject })).toEqual({
        headers: undefined,
        data: jsonCodec.encode({ data: serObject }),
      });
    });

    it('nats message with data and nats headers', async () => {
      const natsHeaders = nats.headers();
      natsHeaders.set('1', 'header_1');
      const natsMessage = new NatsRecordBuilder()
        .setHeaders(natsHeaders)
        .setData({ value: 'string' })
        .build();
      expect(
        await instance.serialize({
          data: natsMessage,
        }),
      ).toEqual({
        headers: natsHeaders,
        data: jsonCodec.encode({
          data: {
            value: 'string',
          },
        }),
      });
    });
  });
});
