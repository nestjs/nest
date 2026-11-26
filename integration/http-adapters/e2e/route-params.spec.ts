import { type INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import { RouteParamsModule } from '../src/route-params/route-params.module.js';

describe.each(adapters('express', 'node'))(
  'Params of routes that share a path shape (%s)',
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

    it.each(['/reports/report.en.json', '/reports/report.en.json/'])(
      'should preserve optional captures after a version miss on %s',
      async path => {
        const v1 = await request(app.getHttpServer())
          .get(path)
          .set('v', '1')
          .expect(200);
        const v2 = await request(app.getHttpServer())
          .get(path)
          .set('v', '2')
          .expect(200);

        expect(v1.body).toEqual({
          version: '1',
          name: 'report.en',
          ext: 'json',
        });
        expect(v2.body).toEqual({
          version: '2',
          name: 'report',
          locale: 'en',
          ext: 'json',
        });
      },
    );

    it('should also match the versioned route without its optional part', async () => {
      for (const version of ['1', '2']) {
        const response = await request(app.getHttpServer())
          .get('/reports/report.json')
          .set('v', version)
          .expect(200);

        expect(response.body).toEqual({ version, name: 'report', ext: 'json' });
      }
    });
  },
);
