import { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import {
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import { expect } from 'chai';

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

  it('should not start when the gateway declared first sets no "verifyClient" and a later one does', async () => {
    const testingModule = await Test.createTestingModule({
      providers: [OtherGateway, CheckedGateway],
    }).compile();
    app = testingModule.createNestApplication({ logger: false });
    app.useWebSocketAdapter(new WsAdapter(app));

    let failure: Error | undefined;
    await app.init().catch(err => (failure = err));
    expect(failure?.message).to.contain(
      'The gateway CheckedGateway sets "verifyClient", but shares the server on port 0',
    );
  });
});
