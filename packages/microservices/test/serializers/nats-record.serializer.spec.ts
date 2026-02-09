import { expect } from 'chai';
import * as nats from 'nats';
import { NatsRecordBuilder } from '../../record-builders/index.js';
import { NatsRecordSerializer } from '../../serializers/nats-record.serializer.js';

const jsonCodec = nats.JSONCodec();

describe('NatsRecordSerializer', () => {
  let instance: NatsRecordSerializer;
  beforeEach(async () => {
    instance = new NatsRecordSerializer();
    await instance.init();
  });
  describe('serialize', () => {
    it('undefined', async () => {
      expect(await instance.serialize({ data: undefined })).to.deep.eq({
        headers: undefined,
        data: jsonCodec.encode({ data: undefined }),
      });
    });

    it('null', async () => {
      expect(await instance.serialize({ data: null })).to.deep.eq({
        headers: undefined,
        data: jsonCodec.encode({ data: null }),
      });
    });

    it('string', async () => {
      expect(await instance.serialize({ data: 'string' })).to.deep.eq({
        headers: undefined,
        data: jsonCodec.encode({ data: 'string' }),
      });
    });

    it('number', async () => {
      expect(await instance.serialize({ data: 12345 })).to.deep.eq({
        headers: undefined,
        data: jsonCodec.encode({ data: 12345 }),
      });
    });

    it('buffer', async () => {
      expect(
        await instance.serialize({ data: Buffer.from('buffer') }),
      ).to.deep.eq({
        headers: undefined,
        data: jsonCodec.encode({ data: Buffer.from('buffer') }),
      });
    });

    it('array', async () => {
      expect(await instance.serialize({ data: [1, 2, 3, 4, 5] })).to.deep.eq({
        headers: undefined,
        data: jsonCodec.encode({ data: [1, 2, 3, 4, 5] }),
      });
    });

    it('object', async () => {
      const serObject = { prop: 'value' };
      expect(await instance.serialize({ data: serObject })).to.deep.eq({
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
      ).to.deep.eq({
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
