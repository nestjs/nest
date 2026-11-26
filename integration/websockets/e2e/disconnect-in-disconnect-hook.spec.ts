import { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket as ServerSocket } from 'socket.io';
import { io, Socket } from 'socket.io-client';

const calls: string[] = [];

function nameOf(client: ServerSocket) {
  return client.handshake.auth.name as string;
}

// The host leaves, so its hook sends the guests away
function kickGuests(server: Server, client: ServerSocket) {
  if (nameOf(client) === 'host') {
    for (const socket of server.sockets.sockets.values()) {
      socket.disconnect(true);
    }
  }
}

@WebSocketGateway()
class KickingRoomGateway {
  @WebSocketServer() server: Server;

  handleDisconnect(client: ServerSocket) {
    calls.push(`room: ${nameOf(client)}`);
    kickGuests(this.server, client);
  }
}

@WebSocketGateway()
class RoomGateway {
  handleDisconnect(client: ServerSocket) {
    calls.push(`room: ${nameOf(client)}`);
  }
}

@WebSocketGateway()
class PresenceGateway {
  handleDisconnect(client: ServerSocket) {
    calls.push(`presence: ${nameOf(client)}`);
  }
}

@WebSocketGateway()
class KickingPresenceGateway {
  @WebSocketServer() server: Server;

  handleDisconnect(client: ServerSocket) {
    calls.push(`presence: ${nameOf(client)}`);
    kickGuests(this.server, client);
  }
}

describe('WebSocketGateway - disconnect from the disconnect hook', () => {
  let app: INestApplication;
  let sockets: Socket[];

  afterEach(async () => {
    sockets?.forEach(socket => socket.disconnect());
    await app?.close();
  });

  async function hostLeaves(gateways: Type[]) {
    calls.length = 0;
    const testingModule = await Test.createTestingModule({
      providers: gateways,
    }).compile();
    app = testingModule.createNestApplication({ logger: false });
    await app.listen(0);
    const url = await app.getUrl();

    sockets = await Promise.all(
      ['host', 'guest'].map(
        name =>
          new Promise<Socket>(resolve => {
            const socket = io(url, {
              auth: { name },
              transports: ['websocket'],
              forceNew: true,
              reconnection: false,
            });
            socket.once('connect', () => resolve(socket));
          }),
      ),
    );
    sockets[0].disconnect();
    // Both clients are reported to both gateways
    await vi.waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(4));
    // ... and nothing more comes after them
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  it('should call handleDisconnect once per client when the hook of the first gateway disconnects other clients', async () => {
    await hostLeaves([KickingRoomGateway, PresenceGateway]);

    expect(calls).toEqual([
      'room: host',
      'room: guest',
      'presence: guest',
      'presence: host',
    ]);
  });

  it('should call handleDisconnect once per client when the hook of the second gateway disconnects other clients', async () => {
    await hostLeaves([RoomGateway, KickingPresenceGateway]);

    expect(calls).toEqual([
      'room: host',
      'presence: host',
      'room: guest',
      'presence: guest',
    ]);
  });
});
