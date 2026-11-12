/**
 * Integration tests for the unbounded-memory paths on the TCP transport.
 *
 * Receiving side: a peer could declare a packet length, send part of the
 * payload and then go silent. Nothing ever reaped the connection, so the
 * partial packet stayed buffered for as long as the peer kept the socket open.
 *
 * Sending side: "socket.write" backpressure was ignored, so a peer that issued
 * requests without reading the responses made the process queue every response
 * in memory.
 *
 * Handling side: a handler was started for every message as soon as it was
 * read, so how many were pending at once was up to a peer that pipelines them.
 */
import { Controller, INestMicroservice } from '@nestjs/common';
import {
  EventPattern,
  MessagePattern,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as net from 'net';
import { Observable } from 'rxjs';

const PAYLOAD = 'x'.repeat(1024 * 1024);

@Controller()
class PayloadController {
  @MessagePattern({ cmd: 'payload' })
  payload(): string {
    return PAYLOAD;
  }
}

@Controller()
class SlowController {
  static started = 0;
  static mostPending = 0;
  static pending: Array<() => void> = [];
  static openStreams = 0;

  @EventPattern('slow')
  async slow(): Promise<void> {
    SlowController.started++;
    SlowController.mostPending = Math.max(
      SlowController.mostPending,
      SlowController.pending.length + 1,
    );
    await new Promise<void>(resolve => SlowController.pending.push(resolve));
  }

  @MessagePattern('stream')
  stream(): Observable<never> {
    return new Observable<never>(() => {
      SlowController.openStreams++;
      return () => SlowController.openStreams--;
    });
  }

  static finishPending() {
    this.pending.splice(0).forEach(resolve => resolve());
  }
}

function frame(obj: unknown): string {
  const json = JSON.stringify(obj);
  return `${json.length}#${json}`;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('TCP transport memory bounds', function () {
  this.timeout(30000);

  let app: INestMicroservice;
  let port: number;
  let acceptedSockets: net.Socket[];

  async function start(options: Record<string, unknown>) {
    acceptedSockets = [];
    const module = await Test.createTestingModule({
      controllers: [PayloadController, SlowController],
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

  describe('maxConcurrentMessages', () => {
    const slowFrame = frame({ pattern: 'slow', data: null });

    beforeEach(() => {
      SlowController.started = 0;
      SlowController.mostPending = 0;
      SlowController.pending = [];
      SlowController.openStreams = 0;
    });

    it('should not start more handlers for a peer than that at once', async () => {
      await start({ maxConcurrentMessages: 10 });
      const socket = await connect();

      socket.write(slowFrame.repeat(1000));
      while (SlowController.pending.length < 10) {
        await sleep(20);
      }
      await sleep(200);
      expect(SlowController.started).to.equal(10);

      // The others are handled as the ones before them finish
      while (SlowController.started < 1000) {
        SlowController.finishPending();
        await sleep(1);
      }
      SlowController.finishPending();
      expect(SlowController.mostPending).to.equal(10);
      expect(acceptedSockets.every(accepted => !accepted.destroyed)).to.be.true;
    });

    it('should still handle every message of a peer that ends the connection after them', async () => {
      // Reading is suspended while they wait, so the end of the connection
      // is only read once most of them have been handled
      await start({ maxConcurrentMessages: 10, maxBufferSize: 1024 });
      const socket = await connect();

      socket.end(slowFrame.repeat(2000));
      while (SlowController.started < 2000) {
        SlowController.finishPending();
        await sleep(1);
      }
      SlowController.finishPending();
      expect(SlowController.mostPending).to.equal(10);
    });

    it('should notice a peer that leaves while reading from it is suspended', async () => {
      await start({
        maxConcurrentMessages: 1,
        maxBufferSize: 1024,
        drainTimeout: 300,
      });
      const socket = await connect();

      // A stream that only ends with the connection, then far more than
      // maxBufferSize characters, so that the end of the connection is
      // behind data that is not read while the stream is pending
      socket.write(
        frame({ pattern: 'stream', data: null, id: '1' }) +
          slowFrame.repeat(30_000),
      );
      while (SlowController.openStreams < 1) {
        await sleep(20);
      }
      socket.destroy();

      const startedAt = Date.now();
      while (SlowController.openStreams > 0 && Date.now() - startedAt < 5000) {
        await sleep(20);
      }
      expect(SlowController.openStreams).to.equal(0);
      expect(SlowController.started).to.equal(0);
      expect(acceptedSockets.every(accepted => accepted.destroyed)).to.be.true;
    });

    it('should count the messages of each peer separately', async () => {
      await start({ maxConcurrentMessages: 10 });
      const sockets = [await connect(), await connect()];

      sockets.forEach(socket => socket.write(slowFrame.repeat(100)));
      while (SlowController.pending.length < 20) {
        await sleep(20);
      }
      await sleep(200);
      expect(SlowController.started).to.equal(20);
      while (SlowController.started < 200) {
        SlowController.finishPending();
        await sleep(1);
      }
      SlowController.finishPending();
    });
  });
});
