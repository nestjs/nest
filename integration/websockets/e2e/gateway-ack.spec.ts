import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { io } from 'socket.io-client';
import { AckGateway } from '../src/ack.gateway';

async function createNestApp(...gateways): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    providers: gateways,
  }).compile();
  const app = testingModule.createNestApplication();
  return app;
}

describe('WebSocketGateway (ack)', () => {
  let ws, app;

  it(`should handle message with ack (http)`, async () => {
    app = await createNestApp(AckGateway);
    await app.listen(3000);

    ws = io('http://localhost:8080');
    await new Promise<void>(resolve =>
      ws.emit('push', { test: 'test' }, data => {
        expect(data).to.be.eql('pong');
        resolve();
      }),
    );
  });

  it(`should handle message with ack & without data (http)`, async () => {
    app = await createNestApp(AckGateway);
    await app.listen(3000);

    ws = io('http://localhost:8080');
    await new Promise<void>(resolve =>
      ws.emit('push', data => {
        expect(data).to.be.eql('pong');
        resolve();
      }),
    );
  });

  it('should handle manual ack for async operations when @Ack() is used (success case)', async () => {
    app = await createNestApp(AckGateway);
    await app.listen(3000);

    ws = io('http://localhost:8080');
    const payload = { shouldSucceed: true };

    await new Promise<void>(resolve =>
      ws.emit('manual-ack', payload, response => {
        expect(response).to.eql({ status: 'success', data: payload });
        resolve();
      }),
    );
  });

  it('should handle manual ack for async operations when @Ack() is used (error case)', async () => {
    app = await createNestApp(AckGateway);
    await app.listen(3000);

    ws = io('http://localhost:8080');
    const payload = { shouldSucceed: false };

    await new Promise<void>(resolve =>
      ws.emit('manual-ack', payload, response => {
        expect(response).to.eql({
          status: 'error',
          message: 'Operation failed',
        });
        resolve();
      }),
    );
  });

  afterEach(() => app.close());
});
