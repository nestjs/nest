import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { EventEmitter } from 'node:events';
import { firstValueFrom, of, toArray } from 'rxjs';
import { BunAdapter } from '@nestjs/platform-bun';
import { BunWsAdapter, type BunWsClient } from '../adapters/bun-ws-adapter.js';

const isBun = typeof (globalThis as any).Bun !== 'undefined';

const events: string[] = [];

@WebSocketGateway()
class EchoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  handleConnection(client: BunWsClient, request: Request) {
    events.push(`connect:${new URL(request.url).pathname}`);
  }

  handleDisconnect() {
    events.push('disconnect');
  }

  @SubscribeMessage('echo')
  echo(@MessageBody() data: unknown) {
    return { event: 'echo', data };
  }

  @SubscribeMessage('join')
  join(@MessageBody() room: string, @ConnectedSocket() client: BunWsClient) {
    client.subscribe(room);
    return { event: 'joined', data: room };
  }

  @SubscribeMessage('shout')
  shout(
    @MessageBody() body: { room: string; text: string },
    @ConnectedSocket() client: BunWsClient,
  ) {
    client.publish(
      body.room,
      JSON.stringify({ event: 'shout', data: body.text }),
    );
  }
}

@WebSocketGateway({ path: '/chat' })
class ChatGateway {
  @SubscribeMessage('ping')
  ping() {
    return { event: 'pong', data: 'chat' };
  }
}

@Controller()
class HttpController {
  @Get('health')
  health() {
    return { ok: true };
  }
}

@Module({
  controllers: [HttpController],
  providers: [EchoGateway, ChatGateway],
})
class AppModule {}

function connect(url: string) {
  const socket = new WebSocket(url);
  const messages: any[] = [];
  const waiters: ((value: any) => void)[] = [];
  socket.addEventListener('message', event => {
    const parsed = JSON.parse(String(event.data));
    const waiter = waiters.shift();
    waiter ? waiter(parsed) : messages.push(parsed);
  });
  return {
    socket,
    opened: new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => resolve(), { once: true });
      socket.addEventListener('error', reject, { once: true });
    }),
    send: (event: string, data: unknown) =>
      socket.send(JSON.stringify({ event, data })),
    next: () =>
      new Promise<any>(resolve =>
        messages.length ? resolve(messages.shift()) : waiters.push(resolve),
      ),
  };
}

describe('BunWsAdapter', () => {
  describe('create', () => {
    it('should reject namespaces', () => {
      const adapter = new BunWsAdapter();
      (adapter as any).logger = { error: vi.fn() };
      expect(() => adapter.create(0, { namespace: 'chat' })).toThrow(
        /does not support namespaces/,
      );
    });

    it('should require a BunAdapter HTTP server to share the HTTP port', () => {
      const adapter = new BunWsAdapter({});
      expect(() => adapter.create(0)).toThrow(/BunAdapter/);
    });

    it('should reject two gateways on the same path', () => {
      const httpServer = { setWebSocketHandler: vi.fn() };
      const adapter = new BunWsAdapter(httpServer);
      adapter.create(0, { path: '/a' });
      expect(() => adapter.create(0, { path: '/a/' })).toThrow(
        /already registered/,
      );
      expect(httpServer.setWebSocketHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('bindMessageHandlers', () => {
    const createClient = () => {
      const client = new EventEmitter() as EventEmitter & {
        readyState: number;
        send: ReturnType<typeof vi.fn>;
      };
      client.readyState = 1;
      client.send = vi.fn();
      return client;
    };

    it('should dispatch parsed messages and send serialized responses', async () => {
      const adapter = new BunWsAdapter();
      const client = createClient();
      adapter.bindMessageHandlers(
        client as any,
        [
          {
            message: 'sum',
            methodName: 'sum',
            callback: (data: number[]) => ({
              event: 'sum',
              data: data.reduce((a, b) => a + b, 0),
            }),
            isAckHandledManually: false,
          },
        ],
        data => of(data),
      );
      client.emit('message', {
        data: JSON.stringify({ event: 'sum', data: [1, 2] }),
      });
      await new Promise(resolve => setImmediate(resolve));
      expect(client.send).toHaveBeenCalledWith('{"event":"sum","data":3}');
    });

    it('should ignore unparsable frames and unknown events', async () => {
      const adapter = new BunWsAdapter();
      const handlersMap = new Map();
      const results = await firstValueFrom(
        adapter
          .bindMessageHandler({ data: '{oops' }, handlersMap, data => of(data))
          .pipe(toArray()),
      );
      expect(results).toEqual([]);
      const unknown = await firstValueFrom(
        adapter
          .bindMessageHandler({ data: '{"event":"nope"}' }, handlersMap, data =>
            of(data),
          )
          .pipe(toArray()),
      );
      expect(unknown).toEqual([]);
    });

    it('should not throw when a response cannot be serialized', async () => {
      const adapter = new BunWsAdapter();
      (adapter as any).logger = { error: vi.fn() };
      const client = createClient();
      adapter.bindMessageHandlers(
        client as any,
        [
          {
            message: 'big',
            methodName: 'big',
            callback: () => ({ event: 'big', data: 1n }),
            isAckHandledManually: false,
          },
        ],
        data => of(data),
      );
      client.emit('message', { data: '{"event":"big"}' });
      await new Promise(resolve => setImmediate(resolve));
      expect(client.send).not.toHaveBeenCalled();
      expect((adapter as any).logger.error).toHaveBeenCalled();
    });
  });

  describe.runIf(isBun)('on Bun.serve', () => {
    let app: Awaited<ReturnType<typeof NestFactory.create>>;
    let url: string;

    beforeAll(async () => {
      app = await NestFactory.create(AppModule, new BunAdapter(), {
        logger: false,
      });
      app.useWebSocketAdapter(new BunWsAdapter(app));
      await app.listen(0);
      url = (await app.getUrl()).replace(/^http/, 'ws');
    });
    afterAll(() => app.close());

    it('should serve HTTP and WebSockets on the same port', async () => {
      const res = await fetch(url.replace(/^ws/, 'http') + '/health');
      expect(await res.json()).toEqual({ ok: true });

      const client = connect(url);
      await client.opened;
      client.send('echo', { hello: 'bun' });
      expect(await client.next()).toEqual({
        event: 'echo',
        data: { hello: 'bun' },
      });
      client.socket.close();
    });

    it('should route gateways by path', async () => {
      const client = connect(url + '/chat');
      await client.opened;
      client.send('ping', null);
      expect(await client.next()).toEqual({ event: 'pong', data: 'chat' });
      client.socket.close();
    });

    it('should call the connection and disconnection hooks', async () => {
      events.length = 0;
      const client = connect(url);
      await client.opened;
      client.socket.close();
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(events).toEqual(['connect:/', 'disconnect']);
    });

    it('should support native pub/sub between clients', async () => {
      const alice = connect(url);
      const bob = connect(url);
      await Promise.all([alice.opened, bob.opened]);
      alice.send('join', 'room');
      bob.send('join', 'room');
      expect(await alice.next()).toEqual({ event: 'joined', data: 'room' });
      expect(await bob.next()).toEqual({ event: 'joined', data: 'room' });
      alice.send('shout', { room: 'room', text: 'hi' });
      expect(await bob.next()).toEqual({ event: 'shout', data: 'hi' });
      alice.socket.close();
      bob.socket.close();
    });

    it('should serve a gateway on its own port', async () => {
      const adapter = new BunWsAdapter();
      const server = adapter.create(39_517, { path: '/standalone' });
      server.on('connection', (client: BunWsClient) =>
        client.send(JSON.stringify({ event: 'ready' })),
      );
      try {
        const client = connect('ws://127.0.0.1:39517/standalone');
        expect(await client.next()).toEqual({ event: 'ready' });
        client.socket.close();
      } finally {
        await adapter.close(server);
        await adapter.dispose();
      }
    });

    it('should refuse to attach a gateway after listen()', async () => {
      const late = new BunWsAdapter(app);
      expect(() => late.create(0, { path: '/late' })).toThrow(
        /listening BunHttpServer/,
      );
    });
  });
});
