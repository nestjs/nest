import { EventEmitter } from 'events';
import { of } from 'rxjs';

/**
 * ClientMqtt and ClientRMQ load their (optional) broker packages with a
 * literal `import()` on the first `connect()` call, so that bundlers can see
 * them. Each test imports the clients from a fresh module graph, so that
 * neither the clients nor the package cache of `@nestjs/common` have loaded
 * anything yet.
 */
describe('Broker packages of ClientMqtt and ClientRMQ', () => {
  let loadPackageCached: (name: string) => any;

  const isLoaded = (name: string) => {
    try {
      return !!loadPackageCached(name);
    } catch {
      return false;
    }
  };

  beforeEach(async () => {
    vi.resetModules();
    ({ loadPackageCached } = await import('@nestjs/common/internal'));
  });

  describe('ClientMqtt', () => {
    const createClient = async () => {
      const { ClientMqtt } = await import('../../client/client-mqtt.js');
      const client = new ClientMqtt({});
      const createClientStub = vi
        .spyOn(client, 'createClient')
        .mockImplementation(() => new EventEmitter() as any);
      vi.spyOn(client, 'connect$' as any).mockImplementation(() => of(true));
      vi.spyOn(client, 'mergeCloseEvent').mockImplementation(
        (_, source) => source,
      );
      return { client, createClientStub };
    };

    it('should load "mqtt" on connect() rather than when constructed', async () => {
      const { client } = await createClient();
      expect(isLoaded('mqtt')).toBe(false);

      await client.connect();
      expect(isLoaded('mqtt')).toBe(true);
    });

    it('should create a single client for concurrent first connect() calls', async () => {
      const { client, createClientStub } = await createClient();

      await Promise.all([client.connect(), client.connect()]);
      expect(createClientStub).toHaveBeenCalledTimes(1);
    });

    it('should not create a client when closed while the package loads', async () => {
      const { client, createClientStub } = await createClient();

      const connectPromise = client.connect();
      await client.close();

      await expect(connectPromise).rejects.toThrow('Connection closed');
      expect(createClientStub).not.toHaveBeenCalled();
    });
  });

  describe('ClientRMQ', () => {
    const createClient = async () => {
      const { ClientRMQ } = await import('../../client/client-rmq.js');
      const client = new ClientRMQ({});
      const createClientStub = vi
        .spyOn(client, 'createClient')
        .mockImplementation(() => new EventEmitter() as any);
      vi.spyOn(client, 'connect$' as any).mockImplementation(() => of(true));
      vi.spyOn(client, 'mergeDisconnectEvent').mockImplementation(
        (_, source) => source,
      );
      vi.spyOn(client, 'createChannel').mockResolvedValue(undefined);
      vi.spyOn(client, 'convertConnectionToPromise').mockResolvedValue(
        undefined,
      );
      return { client, createClientStub };
    };

    it('should load "amqplib" and "amqp-connection-manager" on connect() rather than when constructed', async () => {
      const { client } = await createClient();
      expect(isLoaded('amqplib')).toBe(false);
      expect(isLoaded('amqp-connection-manager')).toBe(false);

      await client.connect();
      expect(isLoaded('amqplib')).toBe(true);
      expect(isLoaded('amqp-connection-manager')).toBe(true);
    });

    it('should create a single client for concurrent first connect() calls', async () => {
      const { client, createClientStub } = await createClient();

      await Promise.all([client.connect(), client.connect()]);
      expect(createClientStub).toHaveBeenCalledTimes(1);
    });

    it('should not create a client when closed while the packages load', async () => {
      const { client, createClientStub } = await createClient();

      const connectPromise = client.connect();
      await client.close();

      await expect(connectPromise).rejects.toThrow('Connection closed');
      expect(createClientStub).not.toHaveBeenCalled();
    });
  });
});
