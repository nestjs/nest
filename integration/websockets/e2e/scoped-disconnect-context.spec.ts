import { Inject, Injectable, INestApplication, Scope } from '@nestjs/common';
import { ContextIdFactory, ModuleRef } from '@nestjs/core';
import { REQUEST_CONTEXT_ID } from '@nestjs/core/router/request/request-constants.js';
import { Test } from '@nestjs/testing';
import { WebSocketGateway } from '@nestjs/websockets';
import { io, Socket } from 'socket.io-client';

@Injectable({ scope: Scope.REQUEST })
class SharedState {}

@Injectable()
class DisconnectTracker {
  client: any;
  sameState = false;
  startSlow: () => void;
  finishFast: () => void;
  finishSlow: () => void;
  release: () => void;
  readonly slowStarted = new Promise<void>(resolve => {
    this.startSlow = resolve;
  });
  readonly fastFinished = new Promise<void>(resolve => {
    this.finishFast = resolve;
  });
  readonly slowFinished = new Promise<void>(resolve => {
    this.finishSlow = resolve;
  });
  readonly gate = new Promise<void>(resolve => {
    this.release = resolve;
  });
}

@WebSocketGateway()
class FastGateway {
  constructor(
    @Inject(SharedState) private readonly state: SharedState,
    @Inject(DisconnectTracker) private readonly tracker: DisconnectTracker,
  ) {}
  handleConnection(client: { emit: Function }) {
    client.emit('fastReady');
  }
  handleDisconnect() {
    this.tracker.finishFast();
  }
}

@WebSocketGateway()
class SlowGateway {
  constructor(
    @Inject(SharedState) private readonly state: SharedState,
    @Inject(DisconnectTracker) private readonly tracker: DisconnectTracker,
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef,
  ) {}
  handleConnection(client: any) {
    this.tracker.client = client;
    client.emit('slowReady');
  }
  async handleDisconnect(client: any) {
    this.tracker.startSlow();
    await this.tracker.gate;
    const resolved = await this.moduleRef.resolve(
      SharedState,
      ContextIdFactory.getByRequest(client),
      { strict: false },
    );
    this.tracker.sameState = resolved === this.state;
    this.tracker.finishSlow();
  }
}

describe('Shared gateway disconnect context', () => {
  let app: INestApplication;
  let client: Socket;
  let tracker: DisconnectTracker;

  afterEach(async () => {
    tracker?.release();
    client?.disconnect();
    await app?.close();
  });

  it('should keep request-scoped dependencies shared while another gateway disconnects', async () => {
    const module = await Test.createTestingModule({
      providers: [FastGateway, SlowGateway, SharedState, DisconnectTracker],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0);
    tracker = app.get(DisconnectTracker);
    client = io(await app.getUrl(), {
      transports: ['websocket'],
      autoConnect: false,
    });
    const ready = Promise.all(
      ['fastReady', 'slowReady'].map(
        event =>
          new Promise<void>((resolve, reject) => {
            client.once(event, resolve);
            client.once('connect_error', reject);
          }),
      ),
    );
    client.connect();
    await ready;
    const contextId = tracker.client[REQUEST_CONTEXT_ID];
    client.disconnect();
    await Promise.all([tracker.slowStarted, tracker.fastFinished]);
    await new Promise(resolve => setImmediate(resolve));
    expect(tracker.client[REQUEST_CONTEXT_ID]).toBe(contextId);
    tracker.release();
    await tracker.slowFinished;
    await new Promise(resolve => setImmediate(resolve));
    expect(tracker.sameState).toBe(true);
    expect(tracker.client[REQUEST_CONTEXT_ID]).toBeUndefined();
  });
});
