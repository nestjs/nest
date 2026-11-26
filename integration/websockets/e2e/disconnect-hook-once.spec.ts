import { INestApplication, Injectable, Scope, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Namespace, Server, Socket } from 'socket.io';
import { io, Socket as ClientSocket } from 'socket.io-client';

const calls: string[] = [];
let onDisconnectHook: () => void;

const nameOf = (client: Socket) => client.handshake.auth.name as string;

function disconnectGuests(server: Server | Namespace) {
  const sockets =
    server instanceof Server ? server.sockets.sockets : server.sockets;
  for (const socket of [...sockets.values()]) {
    if (nameOf(socket) !== 'host') {
      socket.disconnect(true);
    }
  }
}

function recordDisconnect(gateway: string, client: Socket) {
  calls.push(`${gateway}: ${nameOf(client)}`);
  onDisconnectHook();
}

// Disconnects the guests once the host has left
@WebSocketGateway()
class HostGateway {
  @WebSocketServer()
  server: Server;

  handleDisconnect(client: Socket) {
    recordDisconnect('host', client);
    if (nameOf(client) === 'host') {
      disconnectGuests(this.server);
    }
  }
}

@WebSocketGateway()
class ObservingGateway {
  handleDisconnect(client: Socket) {
    recordDisconnect('observer', client);
  }
}

@WebSocketGateway()
class OtherObservingGateway {
  handleDisconnect(client: Socket) {
    recordDisconnect('other observer', client);
  }
}

// Disconnects the guests from a listener of its own on the host's socket
@WebSocketGateway()
class ListeningGateway {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    if (nameOf(client) === 'host') {
      client.on('disconnect', () => disconnectGuests(this.server));
    }
  }

  handleDisconnect(client: Socket) {
    recordDisconnect('listener', client);
  }
}

@WebSocketGateway()
@Injectable({ scope: Scope.REQUEST })
class RequestScopedObservingGateway {
  handleDisconnect(client: Socket) {
    recordDisconnect('scoped observer', client);
  }
}

@WebSocketGateway({ namespace: 'chat' })
class NamespacedHostGateway extends HostGateway {}

@WebSocketGateway({ namespace: '/chat' })
class NamespacedObservingGateway extends ObservingGateway {}

@WebSocketGateway({ namespace: '/' })
class MainNamespaceObservingGateway extends ObservingGateway {}

const CLIENTS = ['host', 'guest 1', 'guest 2'];

const expectedCalls = (...gateways: string[]) =>
  gateways
    .flatMap(gateway => CLIENTS.map(client => `${gateway}: ${client}`))
    .sort();

describe('WebSocketGateway - disconnect hook called once per connection', () => {
  let app: INestApplication;
  let sockets: ClientSocket[] = [];

  afterEach(async () => {
    sockets.forEach(socket => socket.disconnect());
    sockets = [];
    await app?.close();
  });

  async function leaveAsHost(
    providers: Type<unknown>[],
    expectedDisconnects: number,
    namespace = '',
  ) {
    calls.length = 0;
    let remaining = expectedDisconnects;
    let isDone!: () => void;
    const disconnectHooksCalled = new Promise<void>(
      resolve => (isDone = resolve),
    );
    onDisconnectHook = () => --remaining === 0 && isDone();

    const testingModule = await Test.createTestingModule({
      providers,
    }).compile();
    app = testingModule.createNestApplication({ logger: false });
    await app.listen(0);
    const url = `${await app.getUrl()}${namespace}`;

    for (const name of CLIENTS) {
      const socket = io(url, {
        auth: { name },
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
      });
      sockets.push(socket);
      await new Promise(resolve => socket.once('connect', resolve));
    }
    sockets[0].disconnect();

    await disconnectHooksCalled;
    // Leaves time for a hook called once too often
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...calls].sort();
  }

  it('should call the disconnect hook of a single gateway once per client', async () => {
    const result = await leaveAsHost([HostGateway], 3);

    expect(result).toEqual(expectedCalls('host'));
  });

  it('should call the disconnect hook of every gateway once per client when the first gateway disconnects other clients', async () => {
    const result = await leaveAsHost([HostGateway, ObservingGateway], 6);

    expect(result).toEqual(expectedCalls('host', 'observer'));
  });

  it('should call the disconnect hook of every gateway once per client when the last gateway disconnects other clients', async () => {
    const result = await leaveAsHost([ObservingGateway, HostGateway], 6);

    expect(result).toEqual(expectedCalls('host', 'observer'));
  });

  it('should call the disconnect hook of every gateway once per client with more than two gateways', async () => {
    const result = await leaveAsHost(
      [HostGateway, ObservingGateway, OtherObservingGateway],
      9,
    );

    expect(result).toEqual(expectedCalls('host', 'observer', 'other observer'));
  });

  it('should call the disconnect hook of every gateway sharing a namespace once per client', async () => {
    const result = await leaveAsHost(
      [NamespacedHostGateway, NamespacedObservingGateway],
      6,
      '/chat',
    );

    expect(result).toEqual(expectedCalls('host', 'observer'));
  });

  it('should call the disconnect hook of a gateway without a namespace and one on "/" once per client', async () => {
    const result = await leaveAsHost(
      [HostGateway, MainNamespaceObservingGateway],
      6,
    );

    expect(result).toEqual(expectedCalls('host', 'observer'));
  });

  it('should call the disconnect hook of every gateway once per client when a listener of a socket disconnects other clients', async () => {
    const result = await leaveAsHost([ListeningGateway, ObservingGateway], 6);

    expect(result).toEqual(expectedCalls('listener', 'observer'));
  });

  it('should call the disconnect hook of a request-scoped gateway once per client when a listener of a socket disconnects other clients', async () => {
    const result = await leaveAsHost(
      [ListeningGateway, RequestScopedObservingGateway],
      6,
    );

    expect(result).toEqual(expectedCalls('listener', 'scoped observer'));
  });
});
