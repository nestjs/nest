import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NodeAdapter } from '@nestjs/platform-node';
import request from 'supertest';
import { type AdapterName, adapters, createApp } from '../src/adapters.js';
import { RequestOptionsModule } from '../src/request-options/request-options.module.js';

// Each adapter set up to trust the proxy on the loopback interface, where the
// test requests come from: Express through its "trust proxy" setting,
// Fastify and Node through their "trustProxy" option
const trustingLoopback: Record<AdapterName, () => Promise<INestApplication>> = {
  express: () =>
    createApp('express', RequestOptionsModule, app =>
      (app as NestExpressApplication).set('trust proxy', 'loopback'),
    ),
  fastify: () =>
    createApp(
      'fastify',
      RequestOptionsModule,
      undefined,
      {},
      new FastifyAdapter({ trustProxy: 'loopback' }),
    ),
  node: () =>
    createApp(
      'node',
      RequestOptionsModule,
      undefined,
      {},
      new NodeAdapter({ trustProxy: 'loopback' }),
    ),
};

const FORWARDED = {
  'X-Forwarded-For': '203.0.113.7',
  'X-Forwarded-Proto': 'https',
  'X-Forwarded-Host': 'example.com',
};

describe.each(adapters('express', 'fastify', 'node'))(
  'Adapter options for requests (%s)',
  name => {
    let app: INestApplication;

    afterEach(async () => {
      await app.close();
    });

    it('should read the client address, protocol and host a trusted proxy forwards', async () => {
      app = await trustingLoopback[name]();

      const res = await request(app.getHttpServer())
        .get('/client')
        .set(FORWARDED);

      expect(res.body).toEqual({
        ip: '203.0.113.7',
        protocol: 'https',
        hostname: 'example.com',
      });
    });

    it('should ignore the X-Forwarded-* headers by default', async () => {
      app = await createApp(name, RequestOptionsModule);

      const res = await request(app.getHttpServer())
        .get('/client')
        .set(FORWARDED);

      expect(res.body).toEqual({
        ip: '127.0.0.1',
        protocol: 'http',
        hostname: '127.0.0.1',
      });
    });
  },
);
