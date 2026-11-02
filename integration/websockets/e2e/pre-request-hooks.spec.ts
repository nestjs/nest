import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Injectable,
  PreRequestHook,
  UseGuards,
} from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { AsyncLocalStorage } from 'async_hooks';
import { AddressInfo } from 'net';
import { Observable, of } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import WebSocket from 'ws';

type Store = { traceId: string };

const als = new AsyncLocalStorage<Store>();
const calls: string[] = [];

@Injectable()
class StoreGuard implements CanActivate {
  canActivate(_context: ExecutionContext) {
    calls.push(`guard:${als.getStore()?.traceId}`);
    return true;
  }
}

class BaseGateway {
  @UseGuards(StoreGuard)
  @SubscribeMessage('ping')
  onPing(@MessageBody() data: unknown) {
    calls.push(`handler:${als.getStore()?.traceId}`);
    return { event: 'pong', data: { data, traceId: als.getStore()?.traceId } };
  }
}

@WebSocketGateway()
class IoHooksGateway extends BaseGateway {}

@WebSocketGateway({ path: '/hooks' })
class WsHooksGateway extends BaseGateway {}

const runWithStore =
  (traceId: string): PreRequestHook =>
  (_context, next) =>
    new Observable(subscriber =>
      als.run({ traceId }, () => next().subscribe(subscriber)),
    );

const record =
  (name: string): PreRequestHook =>
  (context, next) => {
    calls.push(`${name}:${context.getType()}`);
    return next();
  };

async function createApp(
  gateway: any,
  configure: (app: INestApplication) => void,
  options: { ws?: boolean } = {},
) {
  const testingModule = await Test.createTestingModule({
    providers: [StoreGuard, gateway],
  }).compile();
  const app = testingModule.createNestApplication();
  if (options.ws) {
    app.useWebSocketAdapter(new WsAdapter(app) as any);
  }
  configure(app);
  await app.listen(0);
  const { port } = app.getHttpServer().address() as AddressInfo;
  return { app, port };
}

function emitIo(port: number, event: string, data: unknown) {
  const socket = io(`http://localhost:${port}`, { transports: ['websocket'] });
  const response = new Promise<{ event: string; payload: any }>(resolve => {
    socket.on('pong', payload => resolve({ event: 'pong', payload }));
    socket.on('exception', payload => resolve({ event: 'exception', payload }));
  });
  socket.emit(event, data);
  return { socket, response };
}

async function emitWs(port: number, event: string, data: unknown) {
  const socket = new WebSocket(`ws://localhost:${port}/hooks`);
  await new Promise(resolve => socket.on('open', resolve));
  const response = new Promise<{ event: string; payload: any }>(resolve =>
    socket.on('message', raw => {
      const message = JSON.parse(raw.toString());
      resolve({ event: message.event, payload: message.data });
    }),
  );
  socket.send(JSON.stringify({ event, data }));
  return { socket, response };
}

describe('Gateway preRequest hooks', () => {
  let app: INestApplication;
  let socket: Socket | WebSocket | undefined;

  beforeEach(() => {
    calls.length = 0;
  });

  afterEach(async () => {
    socket?.close();
    socket = undefined;
    await app.close();
  });

  describe('socket.io', () => {
    it('should run the hooks before the guard and share their context with it', async () => {
      let port: number;
      ({ app, port } = await createApp(IoHooksGateway, app =>
        app.registerGatewayPreRequestHook(record('hook'), runWithStore('io')),
      ));

      const emitted = emitIo(port, 'ping', 'hello');
      socket = emitted.socket;

      await expect(emitted.response).resolves.toEqual({
        event: 'pong',
        payload: { data: 'hello', traceId: 'io' },
      });
      expect(calls).toEqual(['hook:ws', 'guard:io', 'handler:io']);
    });

    it('should send a hook error to the exception filters', async () => {
      let port: number;
      ({ app, port } = await createApp(IoHooksGateway, app =>
        app.registerGatewayPreRequestHook(() => {
          throw new WsException('blocked by hook');
        }),
      ));

      const emitted = emitIo(port, 'ping', 'hello');
      socket = emitted.socket;

      await expect(emitted.response).resolves.toMatchObject({
        event: 'exception',
        payload: { status: 'error', message: 'blocked by hook' },
      });
      expect(calls).toEqual([]);
    });

    it('should let a hook answer without running the guard or the handler', async () => {
      let port: number;
      ({ app, port } = await createApp(IoHooksGateway, app =>
        app.registerGatewayPreRequestHook(() =>
          of({ event: 'pong', data: 'short-circuited' }),
        ),
      ));

      const emitted = emitIo(port, 'ping', 'hello');
      socket = emitted.socket;

      await expect(emitted.response).resolves.toEqual({
        event: 'pong',
        payload: 'short-circuited',
      });
      expect(calls).toEqual([]);
    });
  });

  describe('AsyncLocalStorage', () => {
    it.each([
      ['run() around the subscription', runWithStore('scoped')],
      [
        'enterWith()',
        ((_context, next) => {
          als.enterWith({ traceId: 'scoped' });
          return next();
        }) as PreRequestHook,
      ],
    ])('should expose a store set with %s', async (_name, hook) => {
      let port: number;
      ({ app, port } = await createApp(IoHooksGateway, app =>
        app.registerGatewayPreRequestHook(hook),
      ));

      const emitted = emitIo(port, 'ping', 'hello');
      socket = emitted.socket;
      await emitted.response;

      expect(calls).toEqual(['guard:scoped', 'handler:scoped']);
    });
  });

  describe('ws', () => {
    it('should run the hooks before the guard and share their context with it', async () => {
      let port: number;
      ({ app, port } = await createApp(
        WsHooksGateway,
        app =>
          app.registerGatewayPreRequestHook(record('hook'), runWithStore('ws')),
        { ws: true },
      ));

      const emitted = await emitWs(port, 'ping', 'hello');
      socket = emitted.socket;

      await expect(emitted.response).resolves.toEqual({
        event: 'pong',
        payload: { data: 'hello', traceId: 'ws' },
      });
      expect(calls).toEqual(['hook:ws', 'guard:ws', 'handler:ws']);
    });
  });

  describe('hybrid application', () => {
    it('should not run the microservice hooks on gateway messages', async () => {
      let port: number;
      ({ app, port } = await createApp(IoHooksGateway, app => {
        app.registerGatewayPreRequestHook(record('gateway-hook'));
        const microservice = app.connectMicroservice(
          { transport: Transport.TCP, options: { port: 0 } },
          { inheritAppConfig: true },
        );
        microservice.registerPreRequestHook(record('rpc-hook'));
      }));
      await app.startAllMicroservices();

      const emitted = emitIo(port, 'ping', 'hello');
      socket = emitted.socket;
      await emitted.response;

      expect(calls).toEqual([
        'gateway-hook:ws',
        'guard:undefined',
        'handler:undefined',
      ]);
    });
  });
});
