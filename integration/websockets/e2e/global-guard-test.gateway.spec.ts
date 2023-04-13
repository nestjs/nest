import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { io } from 'socket.io-client';
import { APP_GUARD, ApplicationConfig } from '@nestjs/core';
import {
  GlobalGuardTestGateway,
  TestGuard,
} from '../src/global-guard-test.gateway';

async function createNestApp(...gateways): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    providers: [
      {
        provide: APP_GUARD,
        useClass: TestGuard,
      },
      ...gateways,
    ],
  }).compile();
  const app = testingModule.createNestApplication();
  return app;
}

describe('GlobalGuardTestGateway', () => {
  let ws, app: INestApplication;

  it(`should handle message if application config disabled for ws`, async () => {
    app = await createNestApp(GlobalGuardTestGateway);
    await app.listen(3000);

    ws = io('http://localhost:8080');
    ws.emit('test-msg');
    const gateway = app.get(GlobalGuardTestGateway);
    await new Promise<void>(resolve => {
      setTimeout(() => {
        expect(gateway.handledMessage).to.be.eq(true);
        resolve();
      }, 1_000);
    });
  });

  it(`should not handle message if application config enabled for ws`, async () => {
    app = await createNestApp(GlobalGuardTestGateway);

    app.applyApplicationConfigToWs();
    await app.listen(3000);
    ws = io('http://localhost:8080');
    ws.emit('test-msg');
    const gateway = app.get(GlobalGuardTestGateway);
    await new Promise<void>(resolve => {
      setTimeout(() => {
        expect(gateway.handledMessage).to.be.eq(false);
        resolve();
      }, 1_000);
    });
  });

  afterEach(() => app.close());
});
