import type { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import {
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import type { AddressInfo } from 'net';
import WebSocket from 'ws';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

// Gateways on the same port and path share one server, which the gateway
// connected first creates with its own options
@WebSocketGateway({ verifyClient: () => false })
class CheckedGateway {
  @SubscribeMessage('checked')
  onChecked(): WsResponse<string> {
    return { event: 'checked', data: 'reply' };
  }
}

@WebSocketGateway()
class OtherGateway {
  @SubscribeMessage('other')
  onOther(): WsResponse<string> {
    return { event: 'other', data: 'reply' };
  }
}

describe('Gateways sharing a server (WsAdapter)', () => {
  let app: INestApplication;

  afterEach(() => app.close());

  it('should create the server with the options of the gateway declared first', async () => {
    const testingModule = await Test.createTestingModule({
      providers: [CheckedGateway, OtherGateway],
    }).compile();
    app = testingModule.createNestApplication();
    app.useWebSocketAdapter(new WsAdapter(app));
    await listenOnLoopback(app);
    const { port } = app.getHttpServer().address() as AddressInfo;

    const client = new WebSocket(`ws://127.0.0.1:${port}`);
    const outcome = await new Promise<number | 'open'>((resolve, reject) => {
      client.once('open', () => resolve('open'));
      client.once('unexpected-response', (_, response) =>
        resolve(response.statusCode!),
      );
      client.once('error', reject);
    });
    client.terminate();

    expect(outcome).toBe(401);
  });

  it('should not start when the gateway declared first sets no "verifyClient" and a later one does', async () => {
    const testingModule = await Test.createTestingModule({
      providers: [OtherGateway, CheckedGateway],
    }).compile();
    app = testingModule.createNestApplication({ logger: false });
    app.useWebSocketAdapter(new WsAdapter(app));

    await expect(app.init()).rejects.toThrow(
      'The gateway CheckedGateway sets "verifyClient", but shares the server on port 0',
    );
  });
});
