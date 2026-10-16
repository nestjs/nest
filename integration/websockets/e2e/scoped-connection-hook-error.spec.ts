import {
  Catch,
  ExceptionFilter,
  Inject,
  Injectable,
  INestApplication,
  Provider,
  Scope,
  UseFilters,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import { WebSocketGateway, WsException } from '@nestjs/websockets';
import { once } from 'events';
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

@Injectable({ scope: Scope.REQUEST })
class Session {
  constructor(@Inject(REQUEST) private readonly client: WebSocket) {}

  end(reason: string) {
    this.client.close(4401, reason);
  }
}

@Catch(WsException)
@Injectable({ scope: Scope.REQUEST })
class EndSessionFilter implements ExceptionFilter {
  constructor(@Inject(Session) private readonly session: Session) {}

  catch(exception: WsException) {
    this.session.end(exception.message);
  }
}

@UseFilters(EndSessionFilter)
@WebSocketGateway()
class SessionGateway {
  handleConnection() {
    throw new WsException('Unauthorized');
  }
}

@Injectable({ scope: Scope.REQUEST })
class CurrentUser {
  constructor() {
    // e.g. a token check that turns the client away
    throw new WsException('Unauthorized');
  }
}

@UseFilters(EndSessionFilter)
@WebSocketGateway()
class UserGateway {
  constructor(@Inject(CurrentUser) readonly user: CurrentUser) {}

  handleConnection() {}
}

describe('WebSocketGateway request scope - connection hook errors', () => {
  let app: INestApplication;
  const sockets: Socket[] = [];
  const clients: WebSocket[] = [];

  async function start(
    useWsAdapter = false,
    providers: Provider[] = [ConnectionState, RejectingGateway],
  ) {
    const testingModule = await Test.createTestingModule({
      providers,
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

  it('should run a request-scoped filter with the instance of the connection', async () => {
    await start(true, [Session, SessionGateway]);
    const client = new WebSocket((await app.getUrl()).replace('http', 'ws'));
    clients.push(client);
    const [code, reason] = await once(client, 'close', {
      signal: AbortSignal.timeout(5000),
    });

    expect(code).toBe(4401);
    expect(reason.toString()).toBe('Unauthorized');
  });

  it('should run a request-scoped filter when the gateway fails to resolve', async () => {
    await start(true, [Session, CurrentUser, UserGateway]);
    const client = new WebSocket((await app.getUrl()).replace('http', 'ws'));
    clients.push(client);
    const [code, reason] = await once(client, 'close', {
      signal: AbortSignal.timeout(5000),
    });

    expect(code).toBe(4401);
    expect(reason.toString()).toBe('Unauthorized');
  });
});
