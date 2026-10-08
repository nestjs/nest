import { Inject, Injectable, INestApplication, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import { WebSocketGateway, WsException } from '@nestjs/websockets';
import { io, Socket } from 'socket.io-client';
import WebSocket from 'ws';

@Injectable({ scope: Scope.REQUEST })
class ConnectionState {
  constructor(@Inject(REQUEST) readonly client: object) {}
}

@WebSocketGateway()
class RejectingGateway {
  constructor(@Inject(ConnectionState) readonly state: ConnectionState) {}

  handleConnection() {
    throw new WsException('Unauthorized');
  }
}

describe('WebSocketGateway request scope - connection hook errors', () => {
  let app: INestApplication;
  const sockets: Socket[] = [];
  const clients: WebSocket[] = [];

  async function start(useWsAdapter = false) {
    const testingModule = await Test.createTestingModule({
      providers: [ConnectionState, RejectingGateway],
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

  it('should send the exception to a socket.io client', async () => {
    await start();
    const socket = io(await app.getUrl(), {
      autoConnect: false,
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    sockets.push(socket);
    const exception = new Promise(resolve => socket.once('exception', resolve));
    socket.connect();

    expect(await exception).toEqual({
      status: 'error',
      message: 'Unauthorized',
      cause: { pattern: 'handleConnection' },
    });
  });

  it('should send the exception to a ws client', async () => {
    await start(true);
    const client = new WebSocket((await app.getUrl()).replace('http', 'ws'));
    clients.push(client);
    const message = await new Promise<string>((resolve, reject) => {
      client.once('message', data => resolve(data.toString()));
      client.once('error', reject);
    });

    expect(JSON.parse(message)).toEqual({
      event: 'exception',
      data: {
        status: 'error',
        message: 'Unauthorized',
        cause: { pattern: 'handleConnection' },
      },
    });
  });
});
