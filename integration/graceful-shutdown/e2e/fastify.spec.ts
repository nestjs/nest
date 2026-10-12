import {
  Controller,
  Get,
  Injectable,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
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

let shutdownHookEntered: Promise<void>;
let enterShutdownHook: () => void;
let shutdownHookReleased: Promise<void>;
let releaseShutdownHook: () => void;

@Injectable()
class SlowShutdownHook implements OnModuleDestroy {
  onModuleDestroy() {
    enterShutdownHook();
    return shutdownHookReleased;
  }
}

@Module({ imports: [AppModule], providers: [SlowShutdownHook] })
class SlowShutdownModule {}

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

const FASTIFY_503_BODY =
  '{"error":"Service Unavailable","message":"Service Unavailable","statusCode":503}';

const requestSlow = (port: number, agent: http.Agent | false = false) =>
  new Promise<http.IncomingMessage & { body: string }>((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path: '/slow', agent }, res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => (body += chunk));
        res.on('end', () => resolve(Object.assign(res, { body })));
      })
      .on('error', reject);
  });

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
    shutdownHookEntered = new Promise(resolve => (enterShutdownHook = resolve));
    shutdownHookReleased = new Promise(
      resolve => (releaseShutdownHook = resolve),
    );
  });

  afterEach(async () => {
    // Lets a close() that is stuck on a held request or hook settle
    clientSockets.splice(0).forEach(socket => socket.destroy());
    releaseShutdownHook();
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

  it('should allow in-flight requests to complete when return503OnClosing is enabled', async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      { return503OnClosing: true, logger: false },
    );
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as net.AddressInfo;

    const response = new Promise<string>((resolve, reject) => {
      http
        .get(
          {
            host: '127.0.0.1',
            port,
            path: '/slow',
            // Explicitly close connection after response to speed up server shutdown
            headers: { Connection: 'close' },
          },
          res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve(data));
          },
        )
        .on('error', reject);
    });
    await sleep(100);

    const closePromise = app.close();
    expect(await response).toBe('ok');
    await closePromise;
  });

  it('should return 503 for NEW queued requests on existing connections during shutdown', async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      { return503OnClosing: true, logger: false },
    );
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as net.AddressInfo;

    // Force 1 socket to ensure queuing/reuse
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });

    // Request A (slow) occupies the socket
    const inFlight = requestSlow(port, agent);
    await sleep(100);

    const closePromise = app.close();
    // Allow the microtask for prepareClose() to flush
    await sleep(0);

    // Request B is queued behind A on the same socket
    const queued = requestSlow(port, agent);

    expect((await inFlight).statusCode).toBe(200);
    const queuedRes = await queued;
    expect(queuedRes.statusCode).toBe(503);
    expect(queuedRes.body).toBe(FASTIFY_503_BODY);

    await closePromise;
    agent.destroy();
  });

  it('should return 503 with Connection: close while the shutdown hooks run when return503OnClosing is enabled', async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      SlowShutdownModule,
      new FastifyAdapter(),
      { return503OnClosing: true, logger: false },
    );
    let middlewareHits = 0;
    app.use((_req: unknown, _res: unknown, next: () => void) => {
      middlewareHits += 1;
      next();
    });
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as net.AddressInfo;
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });

    expect((await requestSlow(port, agent)).statusCode).toBe(200);
    expect(middlewareHits).toBe(1);

    const closePromise = app.close();
    await shutdownHookEntered;

    // Sent on the kept-alive socket while onModuleDestroy() is still pending
    const res = await requestSlow(port, agent);
    expect(res.statusCode).toBe(503);
    expect(res.headers.connection).toBe('close');
    // Same body as Fastify's own 503 once `close()` runs
    expect(res.body).toBe(FASTIFY_503_BODY);
    // Rejected before Nest middleware runs, as on Express
    expect(middlewareHits).toBe(1);

    releaseShutdownHook();
    await closePromise;
    agent.destroy();
  });

  it('should keep serving requests while the shutdown hooks run when return503OnClosing is not set', async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      SlowShutdownModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as net.AddressInfo;

    const closePromise = app.close();
    await shutdownHookEntered;

    expect((await requestSlow(port)).statusCode).toBe(200);

    releaseShutdownHook();
    await closePromise;
  });
});
