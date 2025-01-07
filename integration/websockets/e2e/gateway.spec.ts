import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { EventSource } from 'eventsource';
import { io } from 'socket.io-client';
import { AppController as LongConnectionController } from '../../nest-application/sse/src/app.controller';
import { ApplicationGateway } from '../src/app.gateway';
import { NamespaceGateway } from '../src/namespace.gateway';
import { ServerGateway } from '../src/server.gateway';

async function createNestApp(...gateways): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    providers: gateways,
  }).compile();
  const app = testingModule.createNestApplication();
  return app;
}

describe('WebSocketGateway', () => {
  let ws: ReturnType<typeof io>, app: INestApplication;

  it(`should handle message (2nd port)`, async () => {
    app = await createNestApp(ApplicationGateway);
    await app.listen(3000);

    ws = io('http://localhost:8080');
    ws.emit('push', {
      test: 'test',
    });
    await new Promise<void>(resolve =>
      ws.on('pop', data => {
        expect(data.test).to.be.eql('test');
        resolve();
      }),
    );
  });

  it(`should handle message (http)`, async () => {
    app = await createNestApp(ServerGateway);
    await app.listen(3000);

    ws = io('http://localhost:3000');
    ws.emit('push', {
      test: 'test',
    });
    await new Promise<void>(resolve =>
      ws.on('pop', data => {
        expect(data.test).to.be.eql('test');
        resolve();
      }),
    );
  });

  it(`should handle message (2 gateways)`, async () => {
    app = await createNestApp(ApplicationGateway, NamespaceGateway);
    await app.listen(3000);

    ws = io('http://localhost:8080');
    io('http://localhost:8080/test').emit('push', {});
    ws.emit('push', {
      test: 'test',
    });
    await new Promise<void>(resolve =>
      ws.on('pop', data => {
        expect(data.test).to.be.eql('test');
        resolve();
      }),
    );
  });

  it(`should be able to get the pattern in an interceptor`, async () => {
    app = await createNestApp(ApplicationGateway);
    await app.listen(3000);

    ws = io('http://localhost:8080');
    ws.emit('getClient', {
      test: 'test',
    });
    await new Promise<void>(resolve =>
      ws.on('popClient', data => {
        expect(data.path).to.be.eql('getClient');
        resolve();
      }),
    );
  });

  it(`should be able to get the pattern in a filter (when the error comes from a known handler)`, async () => {
    app = await createNestApp(ApplicationGateway);
    await app.listen(3000);

    ws = io('http://localhost:8080');
    ws.emit('getClientWithError', {
      test: 'test',
    });
    await new Promise<void>(resolve =>
      ws.on('exception', data => {
        expect(data.pattern).to.be.eql('getClientWithError');
        resolve();
      }),
    );
  });

  describe('shared server for WS and Long-Running connections', () => {
    afterEach(() => {});
    it('should block application shutdown', function (done) {
      let eventSource: EventSource;

      void (async () => {
        this.timeout(30000);

        setTimeout(() => {
          const instance = testingModule.get(ServerGateway);
          expect(instance.onApplicationShutdown.called).to.be.false;
          eventSource.close();
          done();
        }, 25000);

        const testingModule = await Test.createTestingModule({
          providers: [ServerGateway],
          controllers: [LongConnectionController],
        }).compile();
        app = testingModule.createNestApplication();

        await app.listen(3000);

        ws = io(`http://localhost:3000`);
        eventSource = new EventSource(`http://localhost:3000/sse`);

        await new Promise<void>((resolve, reject) => {
          ws.on('connect', resolve);
          ws.on('error', reject);
        });

        await new Promise((resolve, reject) => {
          eventSource.onmessage = resolve;
          eventSource.onerror = reject;
        });

        await app.close();
      })();
    });

    it('should shutdown application immediately when forceCloseConnections is true', async () => {
      const testingModule = await Test.createTestingModule({
        providers: [ServerGateway],
        controllers: [LongConnectionController],
      }).compile();

      app = testingModule.createNestApplication({
        forceCloseConnections: true,
      });

      await app.listen(3000);

      ws = io(`http://localhost:3000`);
      const eventSource = new EventSource(`http://localhost:3000/sse`);

      await new Promise<void>((resolve, reject) => {
        ws.on('connect', resolve);
        ws.on('error', reject);
      });

      await new Promise((resolve, reject) => {
        eventSource.onmessage = resolve;
        eventSource.onerror = reject;
      });

      await app.close();

      const instance = testingModule.get(ServerGateway);
      expect(instance.onApplicationShutdown.called).to.be.true;
      eventSource.close();
    });
  });

  afterEach(() => app.close());
});
