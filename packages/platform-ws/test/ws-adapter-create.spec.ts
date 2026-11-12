import { once } from 'events';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { WsAdapter } from '../adapters/ws-adapter.js';

describe('WsAdapter create options', () => {
  let adapter: WsAdapter;
  let server: WebSocketServer | undefined;
  beforeEach(() => {
    adapter = new WsAdapter();
  });
  afterEach(async () => {
    if (server) await adapter.close(server);
    await adapter.dispose();
  });

  it.each(['omitted', 'undefined', 'explicit'] as const)(
    'accepts %s options and serves a real connection',
    async mode => {
      const path = mode === 'explicit' ? '/live' : '/';
      server =
        mode === 'omitted'
          ? adapter.create(0)
          : mode === 'undefined'
            ? adapter.create(0, undefined)
            : adapter.create(0, { path });
      server!.on('connection', client => client.send('ready'));
      await once(server!, 'listening');
      const port = (server!.address() as { port: number }).port;
      const client = new WebSocket(`ws://127.0.0.1:${port}${path}`);
      try {
        const [message] = await once(client, 'message');
        expect(message.toString()).toBe('ready');
      } finally {
        client.terminate();
      }
    },
  );
});

describe('WsAdapter maxPayload', () => {
  const limit = 1024 * 1024;
  let adapter: WsAdapter;
  let server: WebSocketServer;
  afterEach(async () => {
    await adapter.close(server);
    await adapter.dispose();
  });

  // Resolves with the close code, or 'open' if the server took the message
  const sendOfSize = async (size: number) => {
    // ws reports the message it refused as an error of the client
    vi.spyOn(adapter['logger'], 'error').mockImplementation(() => undefined);
    server.on('connection', client =>
      client.on('message', () => client.send('received')),
    );
    if (!server.address()) {
      await once(server, 'listening');
    }
    const port = (server.address() as { port: number }).port;
    const client = new WebSocket(`ws://127.0.0.1:${port}`);
    await once(client, 'open');
    client.send(Buffer.alloc(size));
    return new Promise<number | 'open'>(resolve => {
      client.once('message', () => {
        resolve('open');
        client.terminate();
      });
      client.once('close', code => resolve(code));
    });
  };

  it('should close a client that sends a message larger than 1 MB by default', async () => {
    adapter = new WsAdapter();
    server = adapter.create(0);

    expect(await sendOfSize(limit + 1)).toBe(1009);
  });

  it('should take a message of 1 MB by default', async () => {
    adapter = new WsAdapter();
    server = adapter.create(0);

    expect(await sendOfSize(limit)).toBe('open');
  });

  it('should take the limit from the adapter options', async () => {
    adapter = new WsAdapter(undefined, { maxPayload: 1024 });
    server = adapter.create(0);

    expect(await sendOfSize(1025)).toBe(1009);
  });

  it('should let the "maxPayload" of a gateway take precedence', async () => {
    adapter = new WsAdapter(undefined, { maxPayload: 1024 });
    const options = { maxPayload: 2 * limit };
    server = adapter.create(0, options);

    expect(await sendOfSize(limit + 1)).toBe('open');
    expect(options).toEqual({ maxPayload: 2 * limit });
  });

  it('should apply the limit to a gateway on the HTTP server', () => {
    adapter = new WsAdapter(createServer());
    const options = { path: '/live' };
    server = adapter.create(0, options);

    expect(server.options.maxPayload).toBe(limit);
    expect(options).toEqual({ path: '/live' });
  });
});
