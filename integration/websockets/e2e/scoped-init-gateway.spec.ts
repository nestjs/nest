import { Inject, Injectable, INestApplication, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { io, Socket } from 'socket.io-client';

@Injectable()
class InitTracker {
  readonly initialized = new Map<string, number>();
}

@Injectable({ scope: Scope.REQUEST })
class ClientState {
  readonly constructed = true;
  constructor(@Inject(REQUEST) readonly client: { id: string }) {}
}

@WebSocketGateway()
class ScopedInitGateway {
  @WebSocketServer()
  server: object;
  private ready = false;

  constructor(
    @Inject(ClientState) private readonly state: ClientState,
    @Inject(InitTracker) private readonly tracker: InitTracker,
  ) {}

  async afterInit(server: object) {
    expect(this.state.constructed).toBe(true);
    expect(this.server).toBe(server);
    const id = this.state.client.id;
    this.tracker.initialized.set(
      id,
      (this.tracker.initialized.get(id) ?? 0) + 1,
    );
    await new Promise(resolve => setImmediate(resolve));
    this.ready = true;
  }

  handleConnection(client: { emit: Function }) {
    client.emit('initialized', { id: this.state.client.id, ready: this.ready });
  }

  @SubscribeMessage('state')
  onMessage() {
    return { id: this.state.client.id, ready: this.ready };
  }
}

describe('Request-scoped gateway initialization', () => {
  let app: INestApplication;
  const clients: Socket[] = [];

  afterEach(async () => {
    clients.splice(0).forEach(client => client.disconnect());
    await app?.close();
  });

  it('should initialize each connection with constructed dependencies before handling events', async () => {
    const module = await Test.createTestingModule({
      providers: [ScopedInitGateway, ClientState, InitTracker],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0);
    const url = await app.getUrl();
    const tracker = app.get(InitTracker);
    expect(tracker.initialized.size).toBe(0);

    for (let index = 0; index < 2; index++) {
      const client = io(url, { transports: ['websocket'], autoConnect: false });
      clients.push(client);
      const initialized = new Promise<{ id: string; ready: boolean }>(
        (resolve, reject) => {
          client.once('initialized', resolve);
          client.once('connect_error', reject);
        },
      );
      client.connect();
      expect(await initialized).toEqual({ id: client.id, ready: true });
      for (let message = 0; message < 2; message++) {
        expect(await client.timeout(2000).emitWithAck('state')).toEqual({
          id: client.id,
          ready: true,
        });
      }
      expect(tracker.initialized.get(client.id!)).toBe(1);
    }
    expect(tracker.initialized.size).toBe(2);
  });
});
