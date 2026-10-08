import { EventEmitter } from 'events';
import { readFileSync } from 'fs';
import { createServer as createTcpServer, type Socket } from 'net';
import { createServer as createTlsServer, type TLSSocket } from 'tls';
import { ClientTCP } from '../../client/client-tcp.js';
import { TcpStatus } from '../../events/tcp.events.js';

describe('ClientTCP TLS connection readiness', () => {
  afterEach(() => vi.restoreAllMocks());

  const fakeConnection = (tls: boolean) => {
    const client = new ClientTCP(tls ? { tlsOptions: {} } : {});
    const netSocket = Object.assign(new EventEmitter(), { destroy: vi.fn() });
    const socket = {
      netSocket,
      on: (event, listener) => netSocket.on(event, listener),
      connect: vi.fn(),
      end: vi.fn(),
    };
    vi.spyOn(client, 'createSocket').mockReturnValue(socket as any);
    vi.spyOn(client['logger'], 'error').mockImplementation(() => {});
    const statuses: TcpStatus[] = [];
    const subscription = client.status.subscribe(status =>
      statuses.push(status),
    );
    return { client, socket, statuses, subscription };
  };

  it('waits for secureConnect before resolving, reporting connected or binding replies', async () => {
    const { client, socket, statuses, subscription } = fakeConnection(true);
    const attempt = client.connect();
    let resolved = false;
    attempt.then(() => {
      resolved = true;
    });
    socket.netSocket.emit('connect');
    await new Promise(resolve => setImmediate(resolve));
    try {
      expect(resolved).toBe(false);
      expect(statuses).toEqual([]);
      expect(socket.netSocket.listenerCount('message')).toBe(0);
    } finally {
      socket.netSocket.emit('secureConnect');
      await attempt;
      subscription.unsubscribe();
      client.close();
    }
    expect(statuses).toEqual([TcpStatus.CONNECTED]);
    expect(socket.netSocket.listenerCount('message')).toBe(1);
  });

  it('keeps using connect for unencrypted sockets', async () => {
    const { client, socket, statuses, subscription } = fakeConnection(false);
    const attempt = client.connect();
    socket.netSocket.emit('connect');
    await attempt;
    expect(statuses).toEqual([TcpStatus.CONNECTED]);
    subscription.unsubscribe();
    client.close();
  });

  it('rejects an error between TCP connection and TLS readiness', async () => {
    const { client, socket, statuses, subscription } = fakeConnection(true);
    const attempt = client.connect();
    socket.netSocket.emit('connect');
    const error = new Error('Certificate validation failed');
    socket.netSocket.emit('error', error);
    try {
      await expect(attempt).rejects.toBe(error);
      expect(statuses).not.toContain(TcpStatus.CONNECTED);
      expect(socket.netSocket.listenerCount('message')).toBe(0);
    } finally {
      subscription.unsubscribe();
      client.close();
    }
  });

  const key = readFileSync(
    new URL(
      '../../../../integration/microservices/src/tcp-tls/privkey.pem',
      import.meta.url,
    ),
  );
  const cert = readFileSync(
    new URL(
      '../../../../integration/microservices/src/tcp-tls/ca.cert.pem',
      import.meta.url,
    ),
  );

  it('ends a TLS connection by destroying its socket once connected only', async () => {
    const pending = fakeConnection(true);
    pending.client.connect().catch(() => {});
    pending.client.close();
    expect(pending.socket.netSocket.destroy).toHaveBeenCalledOnce();
    expect(pending.socket.end).not.toHaveBeenCalled();
    pending.subscription.unsubscribe();

    const connected = fakeConnection(true);
    const attempt = connected.client.connect();
    connected.socket.netSocket.emit('secureConnect');
    await attempt;
    connected.client.close();
    expect(connected.socket.end).toHaveBeenCalledOnce();
    expect(connected.socket.netSocket.destroy).not.toHaveBeenCalled();
    connected.subscription.unsubscribe();
  });

  it('rejects a pending handshake when the client is closed', async () => {
    const peers = new Set<Socket>();
    const server = createTcpServer(socket => {
      peers.add(socket);
      socket.on('error', () => {});
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as { port: number }).port;
    const client = new ClientTCP({
      port,
      host: '127.0.0.1',
      tlsOptions: { rejectUnauthorized: false },
    });
    vi.spyOn(client['logger'], 'error').mockImplementation(() => {});
    const attempt = client.connect();
    const socket = client.unwrap<TLSSocket>();
    try {
      await new Promise(resolve => socket.once('connect', resolve));
      client.close();

      await expect(attempt).rejects.toThrow('Connection closed');
      expect(socket.destroyed).toBe(true);
    } finally {
      for (const peer of peers) peer.destroy();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it.each(['stalled', 'accepted', 'untrusted'] as const)(
    'handles a real %s TLS handshake',
    async mode => {
      const peers = new Set<Socket>();
      const server =
        mode === 'stalled' ? createTcpServer() : createTlsServer({ key, cert });
      server.on('connection', socket => {
        peers.add(socket);
        socket.on('error', () => {});
        socket.on('close', () => peers.delete(socket));
      });
      await new Promise<void>(resolve =>
        server.listen(0, '127.0.0.1', resolve),
      );
      const port = (server.address() as { port: number }).port;
      const client = new ClientTCP({
        port,
        host: '127.0.0.1',
        tlsOptions: { rejectUnauthorized: mode === 'untrusted' },
      });
      vi.spyOn(client['logger'], 'error').mockImplementation(() => {});
      const attempt = client.connect();
      attempt.catch(() => {});
      const socket = client.unwrap<TLSSocket>();
      try {
        if (mode === 'stalled') {
          let settled = false;
          attempt.then(
            () => {
              settled = true;
            },
            () => {
              settled = true;
            },
          );
          await new Promise(resolve => socket.once('connect', resolve));
          await new Promise(resolve => setImmediate(resolve));
          expect(settled).toBe(false);
          expect(socket.getCipher()).toBeUndefined();
        } else if (mode === 'accepted') {
          await attempt;
          expect(socket.getCipher()).toBeDefined();
        } else {
          await expect(attempt).rejects.toBeInstanceOf(Error);
        }
      } finally {
        socket.destroy(new Error('Test finished'));
        await attempt.catch(() => {});
        client.close();
        for (const peer of peers) peer.destroy();
        await new Promise<void>(resolve => server.close(() => resolve()));
      }
    },
  );
});
