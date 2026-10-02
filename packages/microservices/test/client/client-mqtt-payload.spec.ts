import { ClientMqtt } from '../../client/client-mqtt.js';
import { MqttRecord } from '../../record-builders/index.js';

describe('ClientMqtt payload ownership', () => {
  let client: ClientMqtt;
  let publish: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new ClientMqtt({});
    publish = vi.fn((_topic, _payload, _options, callback) => callback?.());
    client['mqttClient'] = {
      publish,
      subscribe: (_topic, callback) => callback(),
      unsubscribe: vi.fn(),
    };
  });

  const send = async (mode: 'request' | 'event', data: unknown) => {
    const packet = { pattern: 'topic', data };
    if (mode === 'request') {
      client['publish'](packet, vi.fn())();
    } else {
      await client['dispatchEvent'](packet);
    }
  };

  describe.each(['request', 'event'] as const)('%s', mode => {
    it('preserves an ordinary payload options field on the wire and in the caller', async () => {
      const data = { options: { business: 'keep' }, value: 1 };

      await send(mode, data);

      expect(data).toEqual({ options: { business: 'keep' }, value: 1 });
      expect(JSON.parse(publish.mock.calls[0][1]).data).toEqual(data);
      expect(publish.mock.calls[0][2]).toBeUndefined();
    });

    it('accepts a frozen payload with an options field', async () => {
      const data = Object.freeze({ options: 'business', value: 1 });

      await send(mode, data);

      expect(publish).toHaveBeenCalledOnce();
      expect(JSON.parse(publish.mock.calls[0][1]).data).toEqual(data);
    });

    it('preserves reusable record options without adding them to the wire payload', async () => {
      const options = {
        qos: 2 as const,
        properties: { userProperties: { trace: 'a' } },
      };
      const data = { options: 'business', value: 1 };
      const record = Object.freeze(new MqttRecord(data, options));

      await send(mode, record);
      await send(mode, record);

      expect(record.options).toBe(options);
      expect(publish).toHaveBeenCalledTimes(2);
      for (const [, payload, transportOptions] of publish.mock.calls) {
        expect(JSON.parse(payload).data).toEqual(data);
        expect(transportOptions).toEqual(options);
      }
    });
  });
});
