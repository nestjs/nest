import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { adapters, createApp, markMiddleware } from '../src/adapters.js';
import { MountPathsModule } from '../src/mount-paths/mount-paths.module.js';

describe.each(adapters('express', 'fastify', 'node'))(
  'app.use() with a list of paths (%s)',
  name => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(name, MountPathsModule, app =>
        app.use(['/css', '/js'], markMiddleware),
      );
    });

    afterAll(async () => {
      await app.close();
    });

    it.each(['/css/site.css', '/js/app.js'])(
      'should run the middleware under %s',
      async path => {
        const res = await request(app.getHttpServer()).get(path);

        expect(res.status).toBe(200);
        expect(res.headers['x-middleware']).toBe('ran');
      },
    );

    it('should not run the middleware under another path', async () => {
      const res = await request(app.getHttpServer()).get('/api/users');

      expect(res.status).toBe(200);
      expect(res.headers['x-middleware']).toBeUndefined();
    });
  },
);
