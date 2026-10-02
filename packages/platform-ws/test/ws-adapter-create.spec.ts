import { once } from 'events';
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
