import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import { RouteParamsModule } from '../src/route-params/route-params.module.js';

describe.each(adapters('express', 'node'))(
  'Params of routes that differ only by param names (%s)',
  name => {
    let app: INestApplication;

    beforeEach(async () => {
      app = await createApp(name, RouteParamsModule, app =>
        app.enableVersioning({ type: VersioningType.HEADER, header: 'v' }),
      );
    });

    afterEach(async () => {
      await app.close();
    });

    it('should give a handler only the params of its own route', async () => {
      const v1 = await request(app.getHttpServer())
        .get('/users/5')
        .set('v', '1');
      const v2 = await request(app.getHttpServer())
        .get('/users/5')
        .set('v', '2');

      expect(v1.body).toEqual({ id: '5' });
      expect(v2.body).toEqual({ userId: '5' });
    });
  },
);
