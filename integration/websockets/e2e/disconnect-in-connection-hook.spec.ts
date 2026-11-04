import { INestApplication, Type } from '@nestjs/common';
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

describe('WebSocketGateway - disconnect from the connection hook', () => {
  let app: INestApplication;
  let socket: Socket;

  afterEach(async () => {
    socket?.disconnect();
    await app?.close();
  });

  async function connect(providers: Type[], expectedDisconnects: number) {
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

    socket = io(await app.getUrl(), {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
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
});
