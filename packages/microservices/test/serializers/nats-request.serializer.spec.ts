import { expect } from 'chai';
import { NatsRequestSerializer } from '../../serializers/nats-request.serializer';
import * as nats from 'nats';

const jsonCodec = nats.JSONCodec();

describe('NatsRequestSerializer', () => {
  let instance: NatsRequestSerializer;
  beforeEach(() => {
    instance = new NatsRequestSerializer();
  });
  describe('serialize', () => {
    it('undefined', () => {
      expect(instance.serialize({ data: undefined })).to.deep.eq({
        headers: undefined,
        value: jsonCodec.encode({ data: undefined }),
      });
    });

    it('null', () => {
      expect(instance.serialize({ data: null })).to.deep.eq({
        headers: undefined,
        value: jsonCodec.encode({ data: null }),
      });
    });

    it('string', () => {
      expect(instance.serialize({ data: 'string' })).to.deep.eq({
        headers: undefined,
        value: jsonCodec.encode({ data: 'string' }),
      });
    });

    it('number', () => {
      expect(instance.serialize({ data: 12345 })).to.deep.eq({
        headers: undefined,
        value: jsonCodec.encode({ data: 12345 }),
      });
    });

    it('buffer', () => {
      expect(instance.serialize({ data: Buffer.from('buffer') })).to.deep.eq({
        headers: undefined,
        value: jsonCodec.encode({ data: Buffer.from('buffer') }),
      });
    });

    it('array', () => {
      expect(instance.serialize({ data: [1, 2, 3, 4, 5] })).to.deep.eq({
        headers: undefined,
        value: jsonCodec.encode({ data: [1, 2, 3, 4, 5] }),
      });
    });

    it('object', () => {
      const serObject = { prop: 'value' };
      expect(instance.serialize({ data: serObject })).to.deep.eq({
        headers: undefined,
        value: jsonCodec.encode({ data: serObject }),
      });
    });
  });

  describe('serialize nats message', () => {
    it('nats message with nats headers', () => {
      const natsHeaders = nats.headers();
      natsHeaders.set('1', 'value');
      expect(
        instance.serialize({
          data: {
            value: 'string',
            headers: natsHeaders,
          },
        }),
      ).to.deep.eq({
        headers: natsHeaders,
        value: jsonCodec.encode({
          data: 'string',
        }),
      });
    });

    it('nats message with record headers', () => {
      const natsHeaders = nats.headers();
      natsHeaders.set('1', 'value');
      expect(
        instance.serialize({
          data: {
            value: 'string',
            headers: { '1': 'value' },
          },
        }),
      ).to.deep.eq({
        headers: natsHeaders,
        value: jsonCodec.encode({
          data: 'string',
        }),
      });
    });
  });
});
