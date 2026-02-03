import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { INestApplication } from '@nestjs/common';
import { expect } from 'chai';
import * as http from 'http';
import { AppModule } from '../src/app.module';

describe('Graceful Shutdown (Express)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should allow in-flight requests to complete when gracefulShutdown is enabled', async () => {
    app = await NestFactory.create(AppModule, new ExpressAdapter() as any, {
      gracefulShutdown: true,
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
    expect(response).to.equal('ok');

    await closePromise;
  }).timeout(10000);

  it('should return 503 for NEW queued requests on existing connections during shutdown', async () => {
    app = await NestFactory.create(AppModule, new ExpressAdapter() as any, {
      gracefulShutdown: true,
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
    expect(status).to.equal(503);

    await closePromise;
    agent.destroy();
  }).timeout(10000);
});
