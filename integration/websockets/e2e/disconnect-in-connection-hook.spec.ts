import { Inject, INestApplication, Provider, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { WebSocketGateway } from '@nestjs/websockets';
import { io, Socket } from 'socket.io-client';

const calls: string[] = [];
let onDisconnectHook: () => void;

@WebSocketGateway()
class SyncDisconnectingGateway {
  handleConnection(client: { disconnect(): void }) {
    calls.push('connect');
    client.disconnect();
    calls.push('after disconnect()');
  }

  handleDisconnect(_: unknown, reason: string) {
    calls.push(`disconnect: ${reason}`);
    onDisconnectHook();
  }
}

@WebSocketGateway()
class AsyncDisconnectingGateway {
  async handleConnection(client: { disconnect(): void }) {
    await Promise.resolve();
    calls.push('connect');
    client.disconnect();
  }

  handleDisconnect(_: unknown, reason: string) {
    calls.push(`disconnect: ${reason}`);
    onDisconnectHook();
  }
}

@WebSocketGateway()
class ObservingGateway {
  handleConnection() {
    calls.push('observer connect');
  }

  handleDisconnect(_: unknown, reason: string) {
    calls.push(`observer disconnect: ${reason}`);
    onDisconnectHook();
  }
}

@WebSocketGateway({ namespace: 'chat' })
class NamespacedSyncDisconnectingGateway extends SyncDisconnectingGateway {}

@WebSocketGateway({ namespace: '/chat' })
class NamespacedObservingGateway extends ObservingGateway {}

@WebSocketGateway({ namespace: '/' })
class MainNamespaceSyncDisconnectingGateway extends SyncDisconnectingGateway {}

@WebSocketGateway({ namespace: '/' })
class MainNamespaceObservingGateway extends ObservingGateway {}

const roomNamespace = /^\/room-\d+$/;

@WebSocketGateway({ namespace: roomNamespace })
class RoomGateway {
  handleConnection() {
    calls.push('room connect');
  }
}

@WebSocketGateway({ namespace: roomNamespace })
class OtherRoomGateway {
  handleConnection() {
    calls.push('other room connect');
  }
}

const CONNECTION_STATE = 'CONNECTION_STATE';

const connectionStateProvider: Provider = {
  provide: CONNECTION_STATE,
  scope: Scope.REQUEST,
  useFactory: () => ({}),
};

// Keeps the gateway from being resolved for as long as the client stays
const connectionStateResolvedOnLeaveProvider: Provider = {
  provide: CONNECTION_STATE,
  scope: Scope.REQUEST,
  inject: [REQUEST],
  useFactory: (client: { once(event: string, listener: () => void): void }) =>
    new Promise<object>(resolve =>
      client.once('disconnect', () => resolve({})),
    ),
};

@WebSocketGateway()
class RequestScopedObservingGateway {
  constructor(@Inject(CONNECTION_STATE) private readonly state: object) {}

  handleConnection() {
    calls.push('scoped observer connect');
  }

  handleDisconnect(_: unknown, reason: string) {
    calls.push(`scoped observer disconnect: ${reason}`);
    onDisconnectHook();
  }
}

describe('WebSocketGateway - disconnect from the connection hook', () => {
  let app: INestApplication;
  let socket: Socket;

  afterEach(async () => {
    socket?.disconnect();
    await app?.close();
  });

  async function connect(
    providers: Provider[],
    expectedDisconnects: number,
    { namespace = '', leaveOnConnect = false } = {},
  ) {
    calls.length = 0;
    let remaining = expectedDisconnects;
    const disconnectHooksCalled = new Promise<void>(resolve => {
      onDisconnectHook = () => --remaining === 0 && resolve();
    });
    const testingModule = await Test.createTestingModule({
      providers,
    }).compile();
    app = testingModule.createNestApplication({ logger: false });
    await app.listen(0);

    socket = io(`${await app.getUrl()}${namespace}`, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    if (leaveOnConnect) {
      socket.once('connect', () => socket.disconnect());
    }
    await Promise.race([
      disconnectHooksCalled,
      new Promise(resolve => setTimeout(resolve, 1000)),
    ]);
  }

  it('should call handleDisconnect when a synchronous handleConnection disconnects the client', async () => {
    await connect([SyncDisconnectingGateway], 1);

    expect(calls).toEqual([
      'connect',
      'after disconnect()',
      'disconnect: server namespace disconnect',
    ]);
  });

  it('should call handleDisconnect when an asynchronous handleConnection disconnects the client', async () => {
    await connect([AsyncDisconnectingGateway], 1);

    expect(calls).toEqual([
      'connect',
      'disconnect: server namespace disconnect',
    ]);
  });

  it('should call handleDisconnect of every gateway after their handleConnection', async () => {
    await connect([SyncDisconnectingGateway, ObservingGateway], 2);

    expect(calls).toEqual([
      'connect',
      'after disconnect()',
      'observer connect',
      'disconnect: server namespace disconnect',
      'observer disconnect: server namespace disconnect',
    ]);
  });

  it('should call handleDisconnect of every gateway sharing a namespace after their handleConnection', async () => {
    await connect(
      [NamespacedSyncDisconnectingGateway, NamespacedObservingGateway],
      2,
      { namespace: '/chat' },
    );

    expect(calls).toEqual([
      'connect',
      'after disconnect()',
      'observer connect',
      'disconnect: server namespace disconnect',
      'observer disconnect: server namespace disconnect',
    ]);
  });

  it.each([
    [
      'a gateway without a namespace and one on "/"',
      [SyncDisconnectingGateway, MainNamespaceObservingGateway],
    ],
    [
      'a gateway on "/" and one without a namespace',
      [MainNamespaceSyncDisconnectingGateway, ObservingGateway],
    ],
  ])(
    'should call handleDisconnect of %s after their handleConnection',
    async (_, providers) => {
      await connect(providers, 2);

      expect(calls).toEqual([
        'connect',
        'after disconnect()',
        'observer connect',
        'disconnect: server namespace disconnect',
        'observer disconnect: server namespace disconnect',
      ]);
    },
  );

  it('should call handleConnection of every gateway sharing a RegExp namespace', async () => {
    await connect([RoomGateway, OtherRoomGateway], 0, {
      namespace: '/room-1',
    });
    if (!socket.connected) {
      await new Promise(resolve => socket.once('connect', resolve));
    }

    expect(calls).toEqual(['room connect', 'other room connect']);
  });

  it('should call handleDisconnect of a request-scoped gateway after its handleConnection', async () => {
    await connect(
      [
        SyncDisconnectingGateway,
        RequestScopedObservingGateway,
        connectionStateProvider,
      ],
      2,
    );

    expect(calls).toEqual([
      'connect',
      'after disconnect()',
      'disconnect: server namespace disconnect',
      'scoped observer connect',
      'scoped observer disconnect: server namespace disconnect',
    ]);
  });

  it('should call handleDisconnect of a request-scoped gateway after its handleConnection when the client leaves while the gateway is being resolved', async () => {
    await connect(
      [RequestScopedObservingGateway, connectionStateResolvedOnLeaveProvider],
      1,
      { leaveOnConnect: true },
    );

    expect(calls).toEqual([
      'scoped observer connect',
      'scoped observer disconnect: client namespace disconnect',
    ]);
  });
});
