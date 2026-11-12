import {
  INestApplicationContext,
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { expect } from 'chai';
import { io, Socket } from 'socket.io-client';
import * as WebSocket from 'ws';

const GATEWAY_PORT = 8095;

class NoopTransport extends Server implements CustomTransportStrategy {
  listen(callback: () => void) {
    callback();
  }
  close() {}
  on() {}
  unwrap<T>(): T {
    return null as T;
  }
}

let hooksCanComplete: Promise<void>;

@Injectable()
class StartupService implements OnModuleInit, OnApplicationBootstrap {
  state = 'constructed';
  calls: string[] = [];

  async onModuleInit() {
    await hooksCanComplete;
    this.state = 'initialized';
  }

  async onApplicationBootstrap() {
    // Long enough for a client that keeps reconnecting to try while it runs
    await new Promise(resolve => setTimeout(resolve, 100));
    this.state = 'bootstrapped';
  }
}

@WebSocketGateway(GATEWAY_PORT)
class OwnPortGateway {
  constructor(
    @Inject(StartupService) private readonly startup: StartupService,
  ) {}

  handleConnection() {
    this.startup.calls.push(`connection: ${this.startup.state}`);
  }

  handleDisconnect() {
    this.startup.calls.push(`disconnection: ${this.startup.state}`);
  }

  @SubscribeMessage('state')
  getState() {
    this.startup.calls.push(`message: ${this.startup.state}`);
    return { event: 'state', data: this.startup.state };
  }
}

describe('WebSocketGateway on its own port - clients connecting during startup', () => {
  let app: INestApplicationContext;
  let started: Promise<unknown>;
  let completeHooks: () => void;
  let ws: WebSocket | undefined;
  let socket: Socket | undefined;

  beforeEach(() => {
    hooksCanComplete = new Promise(resolve => (completeHooks = resolve));
  });

  afterEach(async () => {
    ws?.terminate();
    ws = undefined;
    socket?.disconnect();
    socket = undefined;
    completeHooks();
    await started;
    await app.close();
  });

  // Each one starts without being waited for: its "onModuleInit()" hook stays
  // pending until "completeHooks()" is called.
  const targets = {
    application: async (useWsAdapter: boolean) => {
      const testingModule = await Test.createTestingModule({
        providers: [StartupService, OwnPortGateway],
      }).compile();
      const nestApp = testingModule.createNestApplication({ logger: false });
      useWsAdapter && nestApp.useWebSocketAdapter(new WsAdapter(nestApp));
      app = nestApp;
      started = nestApp.init();
    },
    microservice: async (useWsAdapter: boolean) => {
      const testingModule = await Test.createTestingModule({
        providers: [StartupService, OwnPortGateway],
      }).compile();
      const microservice = testingModule.createNestMicroservice({
        strategy: new NoopTransport(),
        logger: false,
      });
      useWsAdapter && microservice.useWebSocketAdapter(new WsAdapter());
      app = microservice;
      started = microservice.listen();
    },
  };

  /**
   * Connects as soon as the port of the gateway is open, sends a message and
   * resolves with the reply, or with `undefined` if the connection is closed
   * without one.
   */
  async function askForState(): Promise<string | undefined> {
    for (;;) {
      const client = new WebSocket(`ws://localhost:${GATEWAY_PORT}`);
      ws = client;
      const isOpen = await new Promise<boolean>(resolve => {
        client.once('open', () => resolve(true));
        client.once('error', () => resolve(false));
      });
      if (isOpen) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    const client = ws!;
    const reply = new Promise<string | undefined>(resolve => {
      client.once('message', data => resolve(JSON.parse(data.toString()).data));
      client.once('close', () => resolve(undefined));
    });
    client.send(JSON.stringify({ event: 'state' }));
    return reply;
  }

  (['application', 'microservice'] as const).forEach(target =>
    describe(target, () => {
      it('should turn away a client (ws) until the lifecycle hooks have completed', async () => {
        await targets[target](true);

        expect(await askForState()).to.be.undefined;
        expect(app.get(StartupService).calls).to.deep.equal([]);

        completeHooks();
        await started;

        expect(await askForState()).to.equal('bootstrapped');
        expect(app.get(StartupService).calls).to.deep.equal([
          'connection: bootstrapped',
          'message: bootstrapped',
        ]);
      });

      it('should serve a client (socket.io) once it reconnects after the lifecycle hooks have completed', async () => {
        await targets[target](false);

        const client = io(`http://localhost:${GATEWAY_PORT}`, {
          transports: ['websocket'],
          forceNew: true,
          reconnectionDelay: 50,
          reconnectionDelayMax: 50,
        });
        socket = client;
        client.on('connect', () => client.emit('state'));
        const state = new Promise<string>(resolve =>
          client.on('state', resolve),
        );

        const disconnectReason = new Promise<string>(resolve =>
          client.once('disconnect', resolve),
        );
        expect(await Promise.race([disconnectReason, state])).to.equal(
          'transport close',
        );
        expect(app.get(StartupService).calls).to.deep.equal([]);

        completeHooks();

        expect(await state).to.equal('bootstrapped');
        expect(app.get(StartupService).calls).to.deep.equal([
          'connection: bootstrapped',
          'message: bootstrapped',
        ]);
      });
    }),
  );
});
