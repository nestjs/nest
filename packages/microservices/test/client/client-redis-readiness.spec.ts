import { EventEmitter } from 'events';
import { ClientRedis } from '../../client/client-redis.js';
import { RedisStatus } from '../../events/redis.events.js';

class RedisTransport extends EventEmitter {
  public status = 'wait';
  private resolve!: () => void;
  public readonly connect = vi.fn(
    () =>
      new Promise<void>(resolve => {
        this.status = 'connecting';
        this.resolve = resolve;
      }),
  );
  public readonly quit = vi.fn(async () => {});
  public ready() {
    this.status = 'ready';
    this.emit('ready');
    this.resolve();
  }
  public reconnect() {
    this.status = 'reconnecting';
    this.emit('reconnecting');
  }
}

describe('ClientRedis pair readiness', () => {
  let client: ClientRedis;
  let pub: RedisTransport;
  let sub: RedisTransport;
  let statuses: RedisStatus[];
  let unsubscribe: () => void;
  beforeEach(() => {
    client = new ClientRedis({ retryAttempts: 1 });
    pub = new RedisTransport();
    sub = new RedisTransport();
    vi.spyOn(client, 'createClient')
      .mockResolvedValueOnce(pub)
      .mockResolvedValueOnce(sub);
    vi.spyOn(client['logger'], 'log').mockImplementation(() => {});
    vi.spyOn(client['logger'], 'error').mockImplementation(() => {});
    statuses = [];
    const subscription = client.status.subscribe(status =>
      statuses.push(status),
    );
    unsubscribe = () => subscription.unsubscribe();
  });
  afterEach(async () => {
    unsubscribe();
    await client.close();
    vi.restoreAllMocks();
  });

  it.each(['pub', 'sub'])(
    'waits for both clients when %s becomes ready first',
    async first => {
      const attempt = client.connect();
      await new Promise(resolve => setImmediate(resolve));
      const readyFirst = first === 'pub' ? pub : sub;
      const readyLast = first === 'pub' ? sub : pub;
      readyFirst.ready();
      try {
        expect(client.connect()).toBe(attempt);
        expect(statuses).not.toContain(RedisStatus.CONNECTED);
        expect(client['wasInitialConnectionSuccessful']).toBe(false);
      } finally {
        readyLast.ready();
        await attempt;
      }
      expect(statuses).toEqual([RedisStatus.CONNECTED]);
      expect(sub.listenerCount('message')).toBe(1);
    },
  );

  it.each(['pub', 'sub'])(
    'does not recover early when only %s reconnects',
    async first => {
      const attempt = client.connect();
      await new Promise(resolve => setImmediate(resolve));
      pub.ready();
      sub.ready();
      await attempt;
      pub.reconnect();
      sub.reconnect();
      statuses.length = 0;
      (first === 'pub' ? pub : sub).ready();
      try {
        await expect(client.connect()).rejects.toBe(
          'Error: Connection lost. Trying to reconnect...',
        );
        expect(statuses).not.toContain(RedisStatus.CONNECTED);
      } finally {
        (first === 'pub' ? sub : pub).ready();
      }
      await expect(client.connect()).resolves.toBeUndefined();
      expect(statuses).toEqual([RedisStatus.CONNECTED]);
      expect(sub.listenerCount('message')).toBe(1);
    },
  );

  it('recovers when the lost client is ready and its peer stayed ready', async () => {
    const attempt = client.connect();
    await new Promise(resolve => setImmediate(resolve));
    pub.ready();
    sub.ready();
    await attempt;
    pub.reconnect();
    await expect(client.connect()).rejects.toBe(
      'Error: Connection lost. Trying to reconnect...',
    );
    pub.ready();
    await expect(client.connect()).resolves.toBeUndefined();
    expect(sub.listenerCount('message')).toBe(1);
    expect(client.createClient).toHaveBeenCalledTimes(2);
  });
});
