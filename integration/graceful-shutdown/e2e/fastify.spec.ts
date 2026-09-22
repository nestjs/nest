import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { once } from 'events';
import * as http from 'http';
import * as net from 'net';
import { AppModule } from '../src/app.module.js';

let hits = 0;
const clientSockets: net.Socket[] = [];

@Controller()
class HoldController {
  @Get('hold')
  hold() {
    hits += 1;
    return new Promise(() => {});
  }
}

@Module({ imports: [AppModule], controllers: [HoldController] })
class HoldModule {}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const waitUntil = async (predicate: () => boolean) => {
  for (let i = 0; i < 50 && !predicate(); i++) {
    await sleep(20);
  }
};

const within = <T>(promise: Promise<T>, ms = 1500) =>
  Promise.race([
    promise,
    sleep(ms).then(() => {
      throw new Error(`Timed out after ${ms}ms`);
    }),
  ]);

const requestHold = (host: string, port: number, family?: number) =>
  new Promise<net.Socket>(resolve => {
    http
      .get({ host, port, family, path: '/hold', agent: false })
      .once('socket', socket => {
        clientSockets.push(socket);
        resolve(socket);
      })
      .on('error', () => {});
  });

describe('Graceful Shutdown (Fastify)', () => {
  let app: NestFastifyApplication;

  beforeEach(() => {
    hits = 0;
  });

  afterEach(async () => {
    // Lets a close() that is stuck on a held request settle
    clientSockets.splice(0).forEach(socket => socket.destroy());
    await app?.close();
  });

  it('should let in-flight requests complete when forceCloseConnections is not set', async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as net.AddressInfo;

    const response = new Promise<string>((resolve, reject) => {
      http
        .get({ host: '127.0.0.1', port, path: '/slow', agent: false }, res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => resolve(data));
        })
        .on('error', reject);
    });
    await sleep(100);

    const closePromise = app.close();
    expect(await response).toBe('ok');
    await closePromise;
  });

  it('should destroy the in-flight socket of every Fastify bind address', async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      HoldModule,
      new FastifyAdapter(),
      { forceCloseConnections: true, logger: false },
    );
    // Without a host, Fastify binds a secondary server for every address
    // `localhost` resolves to, whose sockets never reach the main server
    await app.listen(0);
    const addresses = app.getHttpAdapter().getInstance().addresses();
    expect(addresses.length).toBeGreaterThan(0);

    const sockets = await Promise.all(
      addresses.map(({ address, family, port }) =>
        requestHold(address, port, family === 'IPv6' ? 6 : 4),
      ),
    );
    await waitUntil(() => hits === addresses.length);
    expect(hits).toBe(addresses.length);

    await within(app.close());
    await within(
      Promise.all(
        sockets.map(socket => socket.destroyed || once(socket, 'close')),
      ),
    );
  });

  it('should destroy connections accepted while Fastify runs preClose hooks', async () => {
    // Otherwise Fastify answers late requests with a 503 and closes the socket
    const adapter = new FastifyAdapter({ return503OnClosing: false });
    app = await NestFactory.create<NestFastifyApplication>(
      HoldModule,
      adapter,
      { forceCloseConnections: true, logger: false },
    );

    let port: number;
    adapter.getInstance().addHook('preClose', async () => {
      const lateSocket = await requestHold('127.0.0.1', port);
      await waitUntil(() => hits > 0 || lateSocket.destroyed);
    });
    await app.listen(0, '127.0.0.1');
    port = (app.getHttpServer().address() as net.AddressInfo).port;

    await within(app.close());
    // Dropped as soon as it was accepted, before the request was handled
    expect(hits).toBe(0);
  });
});
