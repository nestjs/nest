import { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import { WebSocketGateway, WsException } from '@nestjs/websockets';
import { io, Socket } from 'socket.io-client';
import WebSocket from 'ws';

@WebSocketGateway()
class SyncRejectingGateway {
  handleConnection() {
    throw new WsException('Unauthorized');
  }
}

@WebSocketGateway()
class AsyncRejectingGateway {
  async handleConnection() {
    await Promise.resolve();
    throw new WsException('Unauthorized');
  }
}

describe('WebSocketGateway - connection hook errors', () => {
  let app: INestApplication;
  const sockets: Socket[] = [];
  const clients: WebSocket[] = [];

  async function start(gateway: Function, useWsAdapter = false) {
    const testingModule = await Test.createTestingModule({
      providers: [gateway],
    }).compile();
    app = testingModule.createNestApplication({ logger: false });
    if (useWsAdapter) {
      app.useWebSocketAdapter(new WsAdapter(app) as any);
    }
    await app.listen(0);
  }

  afterEach(async () => {
    sockets.splice(0).forEach(socket => socket.disconnect());
    clients.splice(0).forEach(client => client.close());
    await app?.close();
  });

  const expectedException = {
    status: 'error',
    message: 'Unauthorized',
    cause: { pattern: 'handleConnection' },
  };

  describe.each([
    ['throws', SyncRejectingGateway],
    ['rejects', AsyncRejectingGateway],
  ])('when the hook %s', (_, gateway) => {
    it('should send the exception to a socket.io client', async () => {
      await start(gateway);
      const socket = io(await app.getUrl(), {
        autoConnect: false,
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
      });
      sockets.push(socket);
      const exception = new Promise(resolve =>
        socket.once('exception', resolve),
      );
      socket.connect();

      expect(await exception).toEqual(expectedException);
    });

    it('should send the exception to a ws client', async () => {
      await start(gateway, true);
      const client = new WebSocket((await app.getUrl()).replace('http', 'ws'));
      clients.push(client);
      const message = await new Promise<string>((resolve, reject) => {
        client.once('message', data => resolve(data.toString()));
        client.once('error', reject);
      });

      expect(JSON.parse(message)).toEqual({
        event: 'exception',
        data: expectedException,
      });
    });
  });
});
