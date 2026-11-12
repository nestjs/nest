import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { expect } from 'chai';
import { io, Socket } from 'socket.io-client';

@WebSocketGateway()
class UploadGateway {
  @SubscribeMessage('upload')
  onUpload(@MessageBody() parts: Buffer[]) {
    return parts.map(part => part.toString());
  }

  @SubscribeMessage('refused')
  onRefused() {
    throw new WsException('Forbidden');
  }
}

describe('WebSocketGateway - binary messages', () => {
  let app: INestApplication;
  let socket: Socket;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      providers: [UploadGateway],
    }).compile();
    app = testingModule.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    socket = io(await app.getUrl(), {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    await new Promise<void>(resolve => socket.once('connect', () => resolve()));
  });

  afterEach(async () => {
    socket.disconnect();
    await app.close();
  });

  it('should handle a message that sends the same Buffer twice', async () => {
    const part = Buffer.from('content');

    const reply = await socket
      .timeout(2000)
      .emitWithAck('upload', [part, part]);

    expect(reply).to.deep.equal(['content', 'content']);
    expect(socket.connected).to.be.true;
  });

  it('should leave binary data out of the cause of an error reply', async () => {
    const exception = new Promise(resolve => socket.once('exception', resolve));

    socket.emit('refused', { file: Buffer.from('content') });

    expect(await exception).to.deep.equal({
      status: 'error',
      message: 'Forbidden',
      cause: { pattern: 'refused' },
    });
  });
});
