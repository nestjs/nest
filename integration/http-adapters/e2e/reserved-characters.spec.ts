import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import { ReservedCharactersModule } from '../src/reserved-characters/reserved-characters.module.js';

// The middleware of a route sees every request the route serves. Express
// matches the text of its routes in the request path as sent, so it answers
// the encoded forms with 404; Fastify and Node serve them, with the
// middleware.
describe.each(adapters('express', 'fastify', 'node'))(
  'Reserved characters in the text of routes (%s)',
  name => {
    let app: INestApplication;
    const get = (path: string) => request(app.getHttpServer()).get(path);

    beforeEach(async () => {
      app = await createApp(name, ReservedCharactersModule);
    });

    afterEach(async () => {
      await app.close();
    });

    it('should run the middleware of a route for its plain path', async () => {
      const avatar = await get('/avatars/alice-avatar@2x.png');
      const sku = await get('/skus/42-color=red');

      expect(avatar.status).toBe(200);
      expect(avatar.body).toEqual({ user: 'alice' });
      expect(avatar.headers['x-middleware']).toBe('ran');
      expect(sku.status).toBe(200);
      expect(sku.body).toEqual({ sku: '42', color: 'red' });
      expect(sku.headers['x-middleware']).toBe('ran');
    });

    it.each([
      '/avatars/alice-avatar%402x.png',
      '/skus/42-color%3Dred',
      '/discounts/100%25',
    ])(
      'should run the middleware of the route that serves "%s"',
      async path => {
        const res = await get(path);

        if (name === 'express') {
          expect(res.status).toBe(404);
        } else {
          expect(res.status).toBe(200);
          expect(res.headers['x-middleware']).toBe('ran');
        }
      },
    );
  },
);
