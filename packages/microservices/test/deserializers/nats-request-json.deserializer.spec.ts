import { expect } from 'chai';
import { JSONCodec } from 'nats';
import { NatsRequestJSONDeserializer } from '../../deserializers/nats-request-json.deserializer';

describe('NatsRequestJSONDeserializer', () => {
  const options = { channel: 'test' };
  const toNatsData = (packet: unknown) => JSONCodec().encode(packet);
  let instance: NatsRequestJSONDeserializer;

  beforeEach(() => {
    instance = new NatsRequestJSONDeserializer();
  });
  describe('deserialize', () => {
    it('should return a request unchanged', () => {
      const request = { id: '1', pattern: 'test', data: [] };

      expect(instance.deserialize(toNatsData(request), options)).to.deep.equal(
        request,
      );
    });
    [{ array: [1, 2, 3] }, { id: '1' }, 'text', 1, null].forEach(external => {
      it(`should map ${JSON.stringify(external)}, a message of an external system, to the internal schema`, () => {
        expect(
          instance.deserialize(toNatsData(external), options),
        ).to.deep.equal({
          pattern: options.channel,
          data: external,
        });
      });
    });
    [
      { response: 'test', isDisposed: true, id: '1' },
      { response: 'test', id: '1' },
      { err: 'failed', isDisposed: true, id: '1' },
      { isDisposed: true, id: 1 },
    ].forEach(reply => {
      it(`should return ${JSON.stringify(reply)}, a reply of a Nest server, unchanged`, () => {
        expect(instance.deserialize(toNatsData(reply), options)).to.deep.equal(
          reply,
        );
      });
    });
    it('should map a message with more keys than a reply to the internal schema', () => {
      const external = { response: 'test', id: '1', question: 'test' };

      expect(instance.deserialize(toNatsData(external), options)).to.deep.equal(
        {
          pattern: options.channel,
          data: external,
        },
      );
    });
  });
});
