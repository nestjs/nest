import { ClientKafka } from '../../client/client-kafka.js';
import { KafkaHeaders } from '../../enums/index.js';
import {
  EachMessagePayload,
  KafkaMessage,
} from '../../external/kafka.interface.js';

describe('ClientKafka custom deserializer failures', () => {
  const topic = 'test.topic';
  const partition = 0;
  const correlationId = '696fa0a9-1827-4e59-baef-f3628173fe4f';
  const error = new TypeError('Cannot read properties of undefined');
  const message: KafkaMessage = {
    key: Buffer.from('test-key'),
    offset: '0',
    size: 12,
    value: Buffer.from('test-message'),
    timestamp: new Date().toISOString(),
    attributes: 1,
  };
  const payload: EachMessagePayload = {
    topic,
    partition,
    message: Object.assign(
      {
        headers: {
          [KafkaHeaders.CORRELATION_ID]: Buffer.from(correlationId),
        },
      },
      message,
    ),
    heartbeat: async () => {},
    pause: () => () => {},
  };

  function createClient(deserialize: () => Promise<never> | never) {
    const client = new ClientKafka({});
    (client as any).deserializer = { deserialize };
    return client;
  }

  it('should fail the pending request when the deserializer throws', async () => {
    const client = createClient(() => {
      throw error;
    });
    const callback = vi.fn();
    client['routingMap'].set(correlationId, callback);
    const subscription = client.createResponseCallback();

    await expect(subscription(payload)).resolves.toBeUndefined();

    expect(callback).toHaveBeenCalledWith({ err: error, isDisposed: true });
  });

  it('should fail the pending request when the deserializer rejects', async () => {
    const client = createClient(() => Promise.reject(error));
    const callback = vi.fn();
    client['routingMap'].set(correlationId, callback);
    const subscription = client.createResponseCallback();

    await expect(subscription(payload)).resolves.toBeUndefined();

    expect(callback).toHaveBeenCalledWith({ err: error, isDisposed: true });
  });

  it('should resolve without a failure when no request is pending', async () => {
    const client = createClient(() => Promise.reject(error));
    const callback = vi.fn();
    const subscription = client.createResponseCallback();

    await expect(subscription(payload)).resolves.toBeUndefined();

    expect(callback).not.toHaveBeenCalled();
  });
});
