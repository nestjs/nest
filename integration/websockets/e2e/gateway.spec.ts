import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as io from 'socket.io-client';
import { ApplicationGateway } from '../src/app.gateway';
import { NamespaceGateway } from '../src/namespace.gateway';
import { ServerGateway } from '../src/server.gateway';

async function createNestApp(...gateways): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    providers: gateways,
  }).compile();
  const app = await testingModule.createNestApplication();
  return app;
}

describe('WebSocketGateway', () => {
  let ws, app;

  it(`should handle message (2nd port)`, async () => {
    app = await createNestApp(ApplicationGateway);
    await app.listen(3000);

    ws = io.connect('http://localhost:8080');
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

    ws = io.connect('http://localhost:3000');
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

    ws = io.connect('http://localhost:8080');
    io.connect('http://localhost:8080/test').emit('push', {});
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

  afterEach(() => app.close());
});
