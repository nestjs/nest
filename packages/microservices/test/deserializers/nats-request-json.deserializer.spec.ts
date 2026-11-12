import { NatsRequestJSONDeserializer } from '../../deserializers/nats-request-json.deserializer.js';

describe('NatsRequestJSONDeserializer', () => {
  const options = { channel: 'test' };
  const toNatsMsg = (packet: unknown) => ({ json: () => packet });
  let instance: NatsRequestJSONDeserializer;

  beforeEach(() => {
    instance = new NatsRequestJSONDeserializer();
  });
  describe('deserialize', () => {
    it('should return a request unchanged', () => {
      const request = { id: '1', pattern: 'test', data: [] };

      expect(instance.deserialize(toNatsMsg(request), options)).toBe(request);
    });
    it.each([{ array: [1, 2, 3] }, { id: '1' }, 'text', 1, null])(
      'should map %j, a message of an external system, to the internal schema',
      external => {
        expect(instance.deserialize(toNatsMsg(external), options)).toEqual({
          pattern: options.channel,
          data: external,
        });
      },
    );
    it.each([
      { response: 'test', isDisposed: true, id: '1' },
      { response: 'test', id: '1' },
      { err: 'failed', isDisposed: true, id: '1' },
      { isDisposed: true, id: 1 },
    ])('should return %j, a reply of a Nest server, unchanged', reply => {
      expect(instance.deserialize(toNatsMsg(reply), options)).toBe(reply);
    });
    it('should map a message with more keys than a reply to the internal schema', () => {
      const external = { response: 'test', id: '1', question: 'test' };

      expect(instance.deserialize(toNatsMsg(external), options)).toEqual({
        pattern: options.channel,
        data: external,
      });
    });
  });
});
