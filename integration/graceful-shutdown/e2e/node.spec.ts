import {
  INestApplication,
  Injectable,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NodeAdapter } from '@nestjs/platform-node';
import * as http from 'http';
import * as net from 'net';
import { AppModule } from '../src/app.module.js';

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

const requestSlow = (port: number, agent: http.Agent | false = false) =>
  new Promise<http.IncomingMessage>((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path: '/slow', agent }, res => {
        res.resume();
        res.on('end', () => resolve(res));
      })
      .on('error', reject);
  });

describe('Graceful Shutdown (Node)', () => {
  let app: INestApplication;

  beforeEach(() => {
    shutdownHookEntered = new Promise(resolve => (enterShutdownHook = resolve));
    shutdownHookReleased = new Promise(
      resolve => (releaseShutdownHook = resolve),
    );
  });

  afterEach(async () => {
    // Lets a close() that is stuck on a held hook settle
    releaseShutdownHook();
    if (app) {
      await app.close();
    }
  });

  it('should allow in-flight requests to complete when return503OnClosing is enabled', async () => {
    app = await NestFactory.create(AppModule, new NodeAdapter() as any, {
      return503OnClosing: true,
      logger: false,
    });
    await app.listen(0);
    const port = app.getHttpServer().address().port;

    const requestPromise = new Promise<string>((resolve, reject) => {
      http
        .get(
          `http://localhost:${port}/slow`,
          {
            // Explicitly close connection after response to speed up server shutdown
            headers: { Connection: 'close' },
          },
          res => {
            let data = '';
            res.on('data', c => (data += c));
            res.on('end', () => resolve(data));
          },
        )
        .on('error', reject);
    });

    // Wait to ensure request is processing
    await new Promise(r => setTimeout(r, 100));

    const closePromise = app.close();

    // The in-flight request should finish successfully
    const response = await requestPromise;
    expect(response).toBe('ok');

    await closePromise;
  }, 10000);

  it('should return 503 for NEW queued requests on existing connections during shutdown', async () => {
    app = await NestFactory.create(AppModule, new NodeAdapter() as any, {
      return503OnClosing: true,
      logger: false,
    });
    await app.listen(0);
    const port = app.getHttpServer().address().port;

    // Force 1 socket to ensure queuing/reuse
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });

    // 1. Send Request A (slow) - occupies the socket
    const req1 = http.get(`http://localhost:${port}/slow`, { agent });

    // 2. Wait so Request A is definitely "in flight"
    await new Promise(r => setTimeout(r, 100));

    // 3. Trigger Shutdown (don't await yet)
    const closePromise = app.close();

    // Allow the microtask for prepareClose() to flush (sets isShuttingDown)
    await new Promise(r => setTimeout(r, 0));

    // 4. Send Request B immediately using the same agent.
    const statusPromise = new Promise<number>((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/slow`, { agent }, res => {
        resolve(res.statusCode || 0);
      });
      req.on('error', reject);
    });

    // 5. Cleanup Request A
    req1.on('error', () => {});

    const status = await statusPromise;
    expect(status).toBe(503);

    await closePromise;
    agent.destroy();
  }, 10000);

  it('should return 503 with Connection: close while the shutdown hooks run when return503OnClosing is enabled', async () => {
    app = await NestFactory.create(SlowShutdownModule, new NodeAdapter(), {
      return503OnClosing: true,
      logger: false,
    });
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
    // Rejected before Nest middleware runs
    expect(middlewareHits).toBe(1);

    releaseShutdownHook();
    await closePromise;
    agent.destroy();
  });

  it('should keep serving requests while the shutdown hooks run when return503OnClosing is not set', async () => {
    app = await NestFactory.create(SlowShutdownModule, new NodeAdapter(), {
      logger: false,
    });
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as net.AddressInfo;

    const closePromise = app.close();
    await shutdownHookEntered;

    expect((await requestSlow(port)).statusCode).toBe(200);

    releaseShutdownHook();
    await closePromise;
  });
});
