import { ClientNats } from '../../client/client-nats.js';

describe('ClientNats stale status events', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    { type: 'disconnect', server: 'old-server' },
    { type: 'reconnecting' },
    { type: 'reconnect', server: 'old-server' },
    { type: 'update', added: ['old-server'], deleted: [] },
    { type: 'error', error: 'old-error' },
  ])('ignores a late $type after close and reconnect', async status => {
    const client = new ClientNats({});
    const log = vi.spyOn(client['logger'], 'log').mockImplementation(() => {});
    const error = vi
      .spyOn(client['logger'], 'error')
      .mockImplementation(() => {});
    let deliver!: () => void;
    const queued = new Promise<void>(resolve => {
      deliver = resolve;
    });
    const old = {
      close: vi.fn(async () => {}),
      status: async function* () {
        await queued;
        yield status;
      },
    };
    let finishCurrent!: () => void;
    const active = new Promise<void>(resolve => {
      finishCurrent = resolve;
    });
    const current = {
      close: vi.fn(async () => {}),
      status: async function* () {
        yield { type: 'ping' };
        await active;
      },
    };
    const tracking = vi.spyOn(client, 'handleStatusUpdates');
    vi.spyOn(client, 'createClient')
      .mockResolvedValueOnce(old)
      .mockResolvedValueOnce(current);
    await client.connect();
    await client.close();
    await client.connect();
    const cached = client['connectionPromise'];
    const statuses: string[] = [];
    const subscription = client.status.subscribe(status =>
      statuses.push(status),
    );
    statuses.length = 0;
    const callback = vi.fn();
    client.on('disconnect', callback);
    client.on('reconnect', callback);
    client.on('update', callback);
    log.mockClear();
    error.mockClear();
    try {
      deliver();
      await tracking.mock.results[0].value;
      expect(client['connectionPromise']).toBe(cached);
      expect(await client.connect()).toBe(current);
      expect(client.unwrap()).toBe(current);
      expect(statuses).toEqual([]);
      expect(callback).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      finishCurrent();
      await tracking.mock.results[1].value;
      subscription.unsubscribe();
      await client.close();
    }
  });
});
