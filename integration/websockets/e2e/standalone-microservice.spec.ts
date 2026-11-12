import {
  type INestMicroservice,
  Inject,
  Injectable,
  type Type,
} from '@nestjs/common';
import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import { OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';
import { createServer, type AddressInfo, Server as NetServer } from 'net';
import { Server as IoServer } from 'socket.io';

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

@Injectable()
class Tracker {
  servers: any[] = [];
}

@WebSocketGateway()
class BroadcastingGateway implements OnGatewayInit {
  constructor(@Inject(Tracker) private readonly tracker: Tracker) {}

  afterInit(server: unknown) {
    this.tracker.servers.push(server);
  }
}

// e.g. one that broadcasts through a store shared with other processes
class SharedStoreIoAdapter extends IoAdapter {
  createIOServer(port: number | undefined, options?: any) {
    const server = super.createIOServer(port, options);
    (server as any).sharedStore = true;
    return server;
  }
}

const getFreePort = async () => {
  const probe = createServer();
  await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address() as AddressInfo;
  await new Promise(resolve => probe.close(resolve));
  return port;
};

describe('Standalone microservice with gateways', () => {
  let app: INestMicroservice;
  let listen: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    listen = vi.spyOn(NetServer.prototype, 'listen');
  });
  afterEach(async () => {
    await app.close();
    listen.mockRestore();
  });

  async function start(
    providers: Type[],
    adapter?: (app: INestMicroservice) => object,
  ) {
    const testingModule = await Test.createTestingModule({
      providers: [Tracker, ...providers],
    }).compile();
    app = testingModule.createNestMicroservice({
      strategy: new NoopTransport(),
      logger: false,
    });
    if (adapter) {
      app.useWebSocketAdapter(adapter(app) as any);
    }
    await app.listen();
    return app.get(Tracker).servers;
  }

  it('should give a gateway without a port a Socket.IO server that does not listen', async () => {
    const [server] = await start([BroadcastingGateway]);

    expect(server).toBeInstanceOf(IoServer);
    expect(server.engine).toBeUndefined();
    expect(() => server.emit('news', 'to every process')).not.toThrow();
    expect(listen).not.toHaveBeenCalled();
  });

  it('should set up such a server through the adapter of the application', async () => {
    const [server] = await start(
      [BroadcastingGateway],
      app => new SharedStoreIoAdapter(app),
    );

    expect(server.sharedStore).toBe(true);
    expect(server.engine).toBeUndefined();
    expect(listen).not.toHaveBeenCalled();
  });

  it('should give a gateway without a port a ws server that does not listen', async () => {
    const [server] = await start(
      [BroadcastingGateway],
      app => new WsAdapter(app),
    );

    expect(server.options.noServer).toBe(true);
    expect(listen).not.toHaveBeenCalled();
  });

  it('should still serve a gateway with a port of its own', async () => {
    const port = await getFreePort();
    @WebSocketGateway(port)
    class OwnPortGateway extends BroadcastingGateway {}

    const [server] = await start([OwnPortGateway]);

    expect((server.httpServer.address() as AddressInfo).port).toBe(port);
  });
});
