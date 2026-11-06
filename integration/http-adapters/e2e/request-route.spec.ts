import type { INestApplication } from '@nestjs/common';
import { METHODS } from 'http';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import { RequestRouteModule } from '../src/request-route/request-route.module.js';

describe.each(adapters('express', 'node'))('req.route (%s)', name => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp(name, RequestRouteModule, app =>
      app.setGlobalPrefix('api'),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be the route the handler runs for, not the URL', async () => {
    const res = await request(app.getHttpServer()).get('/api/cats/%31');

    expect(res.body).toEqual({
      path: '/api/cats/:id',
      methods: { get: true },
    });
  });

  it('should list every method for a route of all methods', async () => {
    const res = await request(app.getHttpServer()).delete('/api/cats/any/1');

    expect(res.body.path).toBe('/api/cats/any/:id');
    expect(Object.keys(res.body.methods).sort()).toEqual(
      METHODS.map(method => method.toLowerCase()).sort(),
    );
  });
});
