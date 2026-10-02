import {
  CallHandler,
  CanActivate,
  Catch,
  ExecutionContext,
  Inject,
  Injectable,
  INestApplication,
  NestInterceptor,
  PipeTransform,
  Provider,
  Scope,
  Type,
  UseGuards,
} from '@nestjs/common';
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  APP_PIPE,
  REQUEST,
} from '@nestjs/core';
import { REQUEST_CONTEXT_ID } from '@nestjs/core/internal';
import { Test } from '@nestjs/testing';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { map } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';

@Injectable()
class Tracker {
  guards: object[] = [];
  pipes: object[] = [];
  interceptors: object[] = [];
  gateways: object[] = [];
  initialized: object[] = [];
  moduleInitialized: object[] = [];
  disconnected: object[] = [];
  disconnectContexts: boolean[] = [];
  allow = true;
}

@Injectable()
class GlobalGuard implements CanActivate {
  private readonly constructed = true;

  constructor(
    @Inject(Tracker) private readonly tracker: Tracker,
    @Inject(REQUEST) private readonly client: Socket,
  ) {}

  canActivate(context: ExecutionContext) {
    expect(this.constructed).toBe(true);
    expect(this.client).toBe(context.switchToWs().getClient());
    this.tracker.guards.push(this);
    return this.tracker.allow;
  }
}

@Injectable()
class GlobalPipe implements PipeTransform {
  private readonly constructed = true;

  constructor(@Inject(Tracker) private readonly tracker: Tracker) {}

  transform(value: unknown) {
    expect(this.constructed).toBe(true);
    this.tracker.pipes.push(this);
    return typeof value === 'string' ? `${value}:pipe` : value;
  }
}

@Injectable()
class GlobalInterceptor implements NestInterceptor {
  private readonly constructed = true;

  constructor(@Inject(Tracker) private readonly tracker: Tracker) {}

  intercept(_context: ExecutionContext, next: CallHandler) {
    expect(this.constructed).toBe(true);
    this.tracker.interceptors.push(this);
    return next.handle().pipe(map(data => ({ ...data, intercepted: true })));
  }
}

@WebSocketGateway()
class SingletonGateway {
  @WebSocketServer() server: object;
  private sequence = 0;

  constructor(@Inject(Tracker) protected readonly tracker: Tracker) {
    tracker.gateways.push(this);
  }

  afterInit(server: object) {
    expect(this.server).toBe(server);
    expect(this.sequence).toBe(0);
    this.tracker.initialized.push(this);
  }

  onModuleInit() {
    this.tracker.moduleInitialized.push(this);
  }

  async handleDisconnect(client: object) {
    await new Promise(resolve => setImmediate(resolve));
    this.tracker.disconnectContexts.push(REQUEST_CONTEXT_ID in client);
    this.tracker.disconnected.push(client);
  }

  @SubscribeMessage('ping')
  ping(@MessageBody() data: string) {
    return { data, sequence: ++this.sequence };
  }
}

@Injectable({ scope: Scope.REQUEST })
class ConnectionState {
  constructor(@Inject(REQUEST) readonly client: Socket) {}
}

@WebSocketGateway()
class ScopedGateway {
  constructor(
    @Inject(ConnectionState) private readonly state: ConnectionState,
  ) {}

  @SubscribeMessage('ping')
  ping(@ConnectedSocket() client: Socket, @MessageBody() data: string) {
    expect(this.state.client).toBe(client);
    return { data };
  }
}

@Catch()
@Injectable({ scope: Scope.REQUEST })
class GlobalFilter {
  constructor() {
    throw new Error('WebSocket gateways must not resolve global filters');
  }

  catch() {}
}

@Injectable({ scope: Scope.TRANSIENT })
class LocalGuard implements CanActivate {
  private readonly constructed = true;

  constructor(@Inject(Tracker) private readonly tracker: Tracker) {}

  canActivate() {
    expect(this.constructed).toBe(true);
    this.tracker.guards.push(this);
    return true;
  }
}

@WebSocketGateway()
@UseGuards(LocalGuard)
class LocallyGuardedGateway extends SingletonGateway {}

describe('WebSocketGateway global scoped enhancers', () => {
  let app: INestApplication;
  let tracker: Tracker;
  const sockets: Socket[] = [];

  async function start(gateway: Type, providers: Provider[]) {
    const testingModule = await Test.createTestingModule({
      providers: [Tracker, ConnectionState, gateway, ...providers],
    }).compile();
    app = testingModule.createNestApplication();
    await app.listen(0);
    tracker = app.get(Tracker);
  }

  async function connect() {
    const socket = io(await app.getUrl(), {
      autoConnect: false,
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
      socket.connect();
    });
    return socket;
  }

  function ping(socket: Socket, data = 'hello') {
    return socket.timeout(2000).emitWithAck('ping', data);
  }

  afterEach(async () => {
    sockets.splice(0).forEach(socket => socket.disconnect());
    await app?.close();
  });

  for (const scope of [Scope.REQUEST, Scope.TRANSIENT]) {
    for (const gateway of [SingletonGateway, ScopedGateway]) {
      it(`should run a denying global ${Scope[scope]} guard on ${gateway.name}`, async () => {
        await start(gateway, [
          { provide: APP_GUARD, useClass: GlobalGuard, scope },
        ]);
        tracker.allow = false;
        const socket = await connect();
        const exception = new Promise<{ message: string }>(resolve =>
          socket.once('exception', resolve),
        );
        socket.emit('ping', 'denied');

        expect(await exception).toMatchObject({
          message: 'Forbidden resource',
        });
        expect(tracker.guards).toHaveLength(1);
        if (gateway === SingletonGateway) {
          tracker.allow = true;
          expect(await ping(socket)).toMatchObject({ sequence: 1 });
        }
      });
    }

    it(`should reuse ${Scope[scope]} enhancers per connection and preserve singleton hooks and state`, async () => {
      await start(SingletonGateway, [
        { provide: APP_GUARD, useClass: GlobalGuard, scope },
        { provide: APP_PIPE, useClass: GlobalPipe, scope },
        { provide: APP_INTERCEPTOR, useClass: GlobalInterceptor, scope },
        { provide: APP_FILTER, useClass: GlobalFilter },
      ]);
      const first = await connect();
      const second = await connect();
      expect(await ping(first)).toEqual({
        data: 'hello:pipe',
        sequence: 1,
        intercepted: true,
      });
      expect(await ping(first)).toEqual({
        data: 'hello:pipe',
        sequence: 2,
        intercepted: true,
      });
      expect(await ping(second)).toEqual({
        data: 'hello:pipe',
        sequence: 3,
        intercepted: true,
      });

      for (const instances of [
        tracker.guards,
        tracker.pipes,
        tracker.interceptors,
      ]) {
        expect(instances).toHaveLength(3);
        expect(instances[0]).toBe(instances[1]);
        expect(instances[0]).not.toBe(instances[2]);
      }
      expect(tracker.gateways).toHaveLength(1);
      expect(tracker.initialized).toEqual(tracker.gateways);
      expect(tracker.moduleInitialized).toEqual(tracker.gateways);

      first.disconnect();
      await vi.waitFor(() => expect(tracker.disconnected).toHaveLength(1));
      expect(tracker.disconnectContexts).toEqual([true]);
      expect(REQUEST_CONTEXT_ID in tracker.disconnected[0]).toBe(false);
      expect(await ping(second)).toMatchObject({ sequence: 4 });
    });
  }

  for (const [token, enhancer, expected] of [
    [APP_PIPE, GlobalPipe, { data: 'hello:pipe' }],
    [APP_INTERCEPTOR, GlobalInterceptor, { data: 'hello', intercepted: true }],
  ] as const) {
    it(`should resolve ${token} without a global guard`, async () => {
      await start(SingletonGateway, [
        { provide: token, useClass: enhancer, scope: Scope.REQUEST },
      ]);
      expect(await ping(await connect())).toMatchObject(expected);
    });
  }

  it('should construct local transient enhancers when global scoped enhancers require a connection context', async () => {
    await start(LocallyGuardedGateway, [
      { provide: APP_PIPE, useClass: GlobalPipe, scope: Scope.REQUEST },
    ]);
    const socket = await connect();
    expect(await ping(socket)).toMatchObject({ data: 'hello:pipe' });
    expect(await ping(socket)).toMatchObject({ data: 'hello:pipe' });
    expect(tracker.guards).toHaveLength(2);
    expect(tracker.guards[0]).toBe(tracker.guards[1]);
    expect(tracker.gateways).toHaveLength(1);
  });
});
