import { INestApplication, Inject, Injectable } from '@nestjs/common';
import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';
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
  servers: IoServer[] = [];
}

@WebSocketGateway()
class AppGateway implements OnGatewayInit {
  constructor(@Inject(Tracker) private readonly tracker: Tracker) {}

  afterInit(server: IoServer) {
    this.tracker.servers.push(server);
  }
}

describe('Hybrid application with a deferred microservice', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it.each([false, true])(
    'should bind the gateways once, to the HTTP server (inheritAppConfig: %s)',
    async inheritAppConfig => {
      const testingModule = await Test.createTestingModule({
        providers: [Tracker, AppGateway],
      }).compile();
      app = testingModule.createNestApplication();
      app.connectMicroservice(
        { strategy: new NoopTransport() },
        { deferInitialization: true, inheritAppConfig },
      );

      await app.startAllMicroservices();
      await app.init();

      const { servers } = app.get(Tracker);
      expect(servers).toHaveLength(1);
      expect(servers[0].httpServer).toBe(app.getHttpServer());
    },
  );
});
