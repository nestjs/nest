import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as io from 'socket.io-client';
import { AckGateway } from '../src/ack.gateway';

async function createNestApp(...gateways): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    providers: gateways,
  }).compile();
  const app = await testingModule.createNestApplication();
  return app;
}

describe('WebSocketGateway (ack)', () => {
  let ws, app;

  it(`should handle message with ack (http)`, async () => {
    app = await createNestApp(AckGateway);
    await app.listenAsync(3000);

    ws = io.connect('http://localhost:8080');
    await new Promise(resolve =>
      ws.emit('push', { test: 'test' }, data => {
        expect(data).to.be.eql('pong');
        resolve();
      }),
    );
  });

  afterEach(() => app.close());
});
