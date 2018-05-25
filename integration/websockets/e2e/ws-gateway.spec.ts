import * as WebSocket from 'ws';
import { expect } from 'chai';
import { Test, TestingModuleBuilder } from '../../../bundle/testing';
import { INestApplication } from '../../../bundle/common';
import { ApplicationGateway } from '../src/app.gateway';
import { ServerGateway } from '../src/server.gateway';
import { NamespaceGateway } from '../src/namespace.gateway';
import { WsAdapter } from '../../../bundle/websockets/adapters/ws-adapter';

async function createNestApp(...gateways): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    providers: gateways,
  }).compile();
  const app = await testingModule.createNestApplication();
  app.useWebSocketAdapter(new WsAdapter(app.getHttpServer()));
  return app;
}

describe('WebSocketGateway (WsAdapter)', () => {
  const event = 'push';
  let ws, app;

  it.only(`should handle message (2nd port)`, async () => {
    app = await createNestApp(ApplicationGateway);
    await app.listenAsync(3000);

    ws = new WebSocket('ws://localhost:8080');
    await new Promise(resolve => ws.on('open', resolve));

    ws.send(JSON.stringify({ event: 'push', data: {
      test: 'test',
    }}));
    await new Promise(resolve =>
      ws.on('message', data => {
        expect(JSON.parse(data).data.test).to.be.eql('test');
        resolve();
      }),
    );
  });

  it(`should handle non-json messages`, async () => {
    app = await createNestApp(ApplicationGateway);
    await app.listenAsync(3000);

    ws = new WebSocket('ws://localhost:8080');
    await new Promise(resolve => ws.on('open', resolve));

    ws.send('not json');
    return new Promise(resolve =>
      ws.on('message', data => {
        expect(JSON.parse(data).error).to.be.eql('Websocket handler error');
        resolve();
      }),
    );
  });
  it(`should handle message (http)`, async () => {
    app = await createNestApp(ServerGateway);
    await app.listenAsync(3000);

    ws = new WebSocket('ws://localhost:3000');
    await new Promise(resolve => ws.on('open', resolve));

    ws.send(JSON.stringify({ event: 'push', data: {
      test: 'test',
    }}));
    await new Promise(resolve =>
      ws.on('message', data => {
        expect(JSON.parse(data).data.test).to.be.eql('test');
        resolve();
      }),
    );
  });

  afterEach(() => app.close());
});
