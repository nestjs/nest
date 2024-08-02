import { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import * as WebSocket from 'ws';
import { ValidationPipeGateway } from '../src/validation-pipe.gateway';
import { expect } from 'chai';
import { ApplicationGateway } from '../src/app.gateway';

async function createNestApp(...gateways): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    providers: gateways,
  }).compile();
  const app = testingModule.createNestApplication();
  app.useWebSocketAdapter(new WsAdapter(app) as any);
  return app;
}

const testBody = { ws: null, app: null };

async function prepareGatewayAndClientForResponseAction(
  gateway: typeof ValidationPipeGateway | ApplicationGateway,
  action: () => void,
) {
  testBody.app = await createNestApp(gateway);
  await testBody.app.listen(3000);

  testBody.ws = new WebSocket('ws://localhost:8080');
  await new Promise(resolve => testBody.ws.on('open', resolve));

  testBody.ws.send(
    JSON.stringify({
      event: 'push',
      data: {
        stringProp: 123,
      },
    }),
  );

  action();
}

const UNCAUGHT_EXCEPTION = 'uncaughtException';

type WsExceptionWithWrappedValidationError = {
  getError: () => {
    response: {
      message: string[];
    };
  };
};

function prepareToHandleExpectedUncaughtException() {
  const listeners = process.listeners(UNCAUGHT_EXCEPTION);
  process.removeAllListeners(UNCAUGHT_EXCEPTION);

  process.on(
    UNCAUGHT_EXCEPTION,
    (err: WsExceptionWithWrappedValidationError) => {
      expect(err.getError().response.message[0]).to.equal(
        'stringProp must be a string',
      );
      reattachUncaughtExceptionListeners(listeners);
    },
  );
}

function reattachUncaughtExceptionListeners(
  listeners: NodeJS.UncaughtExceptionListener[],
) {
  process.removeAllListeners(UNCAUGHT_EXCEPTION);
  for (const listener of listeners) {
    process.on(UNCAUGHT_EXCEPTION, listener);
  }
}

describe('WebSocketGateway with ValidationPipe', () => {
  it(`should throw WsException`, async () => {
    prepareToHandleExpectedUncaughtException();

    await prepareGatewayAndClientForResponseAction(
      ValidationPipeGateway,
      () => {
        testBody.ws.once('message', () => {});
      },
    );
  });

  it('should return message normally', async () => {
    await new Promise<void>(resolve =>
      prepareGatewayAndClientForResponseAction(ApplicationGateway, async () => {
        testBody.ws.once('message', msg => {
          expect(JSON.parse(msg).data.stringProp).to.equal(123);
          resolve();
        });
      }),
    );
  });

  afterEach(function (done) {
    testBody.ws.close();
    testBody.app.close().then(() => done());
  });
});
