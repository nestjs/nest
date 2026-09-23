import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { join } from 'path';
import { AppModule } from '../src/app.module.js';

describe('Listen (Fastify Application)', () => {
  let testModule: TestingModule;
  let app: INestApplication;

  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = testModule.createNestApplication(new FastifyAdapter());
  });

  afterEach(async () => {
    await app.close();
  });

  it('should resolve with httpServer on success', async () => {
    const response = await app.listen(3000);
    expect(response).toEqual(app.getHttpServer());
  });

  it('should reject if the port is not available', async () => {
    await app.listen(3000);
    const secondApp = testModule.createNestApplication(new FastifyAdapter());
    await expect(secondApp.listen(3000)).rejects.toMatchObject({
      code: 'EADDRINUSE',
    });

    await secondApp.close();
  });

  it('should reject if there is an invalid host', async () => {
    await expect(app.listen(3000, '1')).rejects.toMatchObject({
      code: 'EADDRNOTAVAIL',
    });
  });

  it('should serve static assets registered before listen()', async () => {
    // `useStaticAssets()` discards what the adapter returns, so the plugin
    // has to reach fastify before the next statement runs.
    (app as NestFastifyApplication).useStaticAssets({
      root: join(import.meta.dirname, '..', 'public'),
      prefix: '/public/',
    });

    await app.listen(3000);

    const response = await fetch('http://localhost:3000/public/hello.txt');
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain('static asset');
  });
});
