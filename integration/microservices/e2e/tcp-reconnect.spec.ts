import { ClientTCP, JsonSocket } from '@nestjs/microservices';
import { once } from 'events';
import * as net from 'net';
import { lastValueFrom, timeout, toArray } from 'rxjs';

describe('TCP client reconnect', () => {
  let server: net.Server;
  let client: ClientTCP;
  let serverSockets: net.Socket[];
  let clientSockets: net.Socket[];
  let accepted: Promise<void>;

  beforeEach(async () => {
    serverSockets = [];
    clientSockets = [];
    // Keep the old connection half-open until the new one has a pending
    // request, so its late close is controlled by real TCP FINs, not timers.
    server = net.createServer({ allowHalfOpen: true });
    accepted = new Promise(resolve => {
      server.on('connection', socket => {
        serverSockets.push(socket);
        socket.resume();
        if (serverSockets.length === 2) {
          resolve();
        }
      });
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    client = new ClientTCP({
      host: '127.0.0.1',
      port: (server.address() as net.AddressInfo).port,
    });
  });

  afterEach(async () => {
    client?.close();
    // Also clean up sockets that a regression might leave untracked.
    for (const socket of [...clientSockets, ...serverSockets]) {
      socket.destroy();
    }
    await new Promise<void>((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()));
    });
  });

  for (const closeWhileConnecting of [false, true]) {
    it(`should preserve streamed responses after closing ${
      closeWhileConnecting ? 'a connecting' : 'a connected'
    } socket and reconnecting`, async () => {
      const connectA = client.connect();
      const socketA = client.unwrap<net.Socket>();
      clientSockets.push(socketA);
      if (!closeWhileConnecting) {
        await connectA;
      }

      const closedA = once(socketA, 'close');
      client.close();
      const connectB = client.connect();
      const socketB = client.unwrap<net.Socket>();
      clientSockets.push(socketB);
      await Promise.all([connectA, connectB, accepted]);

      const serverA = serverSockets.find(
        socket => socket.remotePort === socketA.localPort,
      )!;
      const serverB = serverSockets.find(
        socket => socket.remotePort === socketB.localPort,
      )!;
      const messages = new JsonSocket(serverB);
      const request = once(serverB, 'message');
      // Handle rejection immediately, including when a stale close fails the
      // request before the server sends its response.
      const response = lastValueFrom(
        client.send<string>('stream', {}).pipe(timeout(5000), toArray()),
      ).then(
        values => ({ values }),
        error => ({ error }),
      );
      const [packet] = await request;

      serverA.end();
      await closedA;
      messages.sendMessage({ id: packet.id, response: 'a' });
      messages.sendMessage({ id: packet.id, response: 'b' });
      messages.sendMessage({ id: packet.id, isDisposed: true });

      expect(await response).toEqual({ values: ['a', 'b'] });
      expect(client.unwrap<net.Socket>()).toBe(socketB);
      await client.connect();
      expect(client.unwrap<net.Socket>()).toBe(socketB);
      expect(serverSockets).toHaveLength(2);
    });
  }
});
