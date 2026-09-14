/**
 * Integration tests for the two unbounded-memory paths on the TCP transport.
 *
 * Receiving side: a peer could declare a packet length, send part of the
 * payload and then go silent. Nothing ever reaped the connection, so the
 * partial packet stayed buffered for as long as the peer kept the socket open.
 *
 * Sending side: "socket.write" backpressure was ignored, so a peer that issued
 * requests without reading the responses made the process queue every response
 * in memory.
 */
import { Controller, INestMicroservice } from '@nestjs/common';
import {
  MessagePattern,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as net from 'net';

const PAYLOAD = 'x'.repeat(1024 * 1024);

@Controller()
class PayloadController {
  @MessagePattern({ cmd: 'payload' })
  payload(): string {
    return PAYLOAD;
  }
}

function frame(obj: unknown): string {
  const json = JSON.stringify(obj);
  return `${json.length}#${json}`;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('TCP transport memory bounds', () => {
  let app: INestMicroservice;
  let port: number;

  let acceptedSockets: net.Socket[];

  async function start(options: Record<string, unknown>) {
    acceptedSockets = [];
    const module = await Test.createTestingModule({
      controllers: [PayloadController],
    }).compile();

    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 0, ...options },
    });
    await app.listen();
    const netServer = app.unwrap<net.Server>();
    netServer.on('connection', socket => acceptedSockets.push(socket));
    port = (netServer.address() as net.AddressInfo).port;
  }

  async function connect(): Promise<net.Socket> {
    const socket = net.createConnection(port, '127.0.0.1');
    socket.on('error', () => {});
    await new Promise(resolve => socket.once('connect', resolve));
    return socket;
  }

  afterEach(async () => {
    await app.close();
  });

  describe('incompleteMessageTimeout', () => {
    it('should drop a peer that goes silent in the middle of a packet', async () => {
      await start({ incompleteMessageTimeout: 300 });
      const socket = await connect();
      const closed = new Promise<void>(resolve =>
        socket.once('close', () => resolve()),
      );

      // Declare a packet far larger than what is actually sent, then stall.
      socket.write('999999999#');
      socket.write('partial payload');

      await closed;
      expect(socket.destroyed).to.be.true;
    });

    it('should not drop a slow but progressing transfer', async () => {
      await start({ incompleteMessageTimeout: 300 });
      const socket = await connect();
      let closed = false;
      socket.once('close', () => (closed = true));

      const payload = JSON.stringify({ pattern: { cmd: 'payload' }, id: '1' });
      socket.write(`${payload.length}#`);
      // Trickle the payload out over more than the timeout, one byte at a time.
      for (const char of payload) {
        socket.write(char);
        await sleep(20);
      }

      await sleep(100);
      expect(closed).to.be.false;
    });

    it('should not drop an idle peer that is between packets', async () => {
      await start({ incompleteMessageTimeout: 300 });
      const socket = await connect();
      let closed = false;
      socket.once('close', () => (closed = true));

      socket.write(frame({ pattern: { cmd: 'payload' }, data: null, id: '1' }));
      await sleep(800);

      expect(closed).to.be.false;
    });
  });

  describe('maxSendBufferSize', () => {
    it('should drop a peer that lets responses pile up unread', async () => {
      await start({ maxSendBufferSize: 2 * 1024 * 1024 });
      const socket = await connect();

      // Ask for far more than the cap allows and never read the replies. The
      // assertion is made on the server side: a paused peer does not observe
      // its own connection being reset until it starts reading again.
      socket.pause();
      for (let i = 0; i < 20; i++) {
        socket.write(
          frame({ pattern: { cmd: 'payload' }, data: null, id: String(i) }),
        );
      }

      while (!acceptedSockets.some(accepted => accepted.destroyed)) {
        await sleep(20);
      }
      expect(acceptedSockets[0].destroyed).to.be.true;
    });

    it('should serve a peer that reads its responses', async () => {
      await start({ maxSendBufferSize: 32 * 1024 * 1024 });
      const socket = await connect();

      let receivedBytes = 0;
      socket.on('data', chunk => (receivedBytes += chunk.length));
      for (let i = 0; i < 20; i++) {
        socket.write(
          frame({ pattern: { cmd: 'payload' }, data: null, id: String(i) }),
        );
      }

      // Every response has to arrive in full, and the peer is never dropped.
      while (receivedBytes < 20 * PAYLOAD.length) {
        await sleep(20);
      }
      expect(acceptedSockets.every(accepted => !accepted.destroyed)).to.be.true;
    });
  });
});
