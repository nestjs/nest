import {
  INestApplication,
  RequestMethod,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Middleware', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
  });

  it(`should get the params in the global prefix`, async () => {
    app.setGlobalPrefix('/api/:tenantId');

    server = app.getHttpServer();
    await app.init();

    await request(server)
      .get('/api/test/foo')
      .expect(200, {
        param: { '0': 'foo', tenantId: 'test' },
      });

    await request(server)
      .get('/api/test/v2/foo')
      .expect(200, {
        version: 'v2',
        param: { '0': 'foo', tenantId: 'test' },
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
