import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { CatsModule } from '../../src/cats/cats.module';
import { CatsService } from '../../src/cats/cats.service';
import { CoreModule } from '../../src/core/core.module';

describe('Cats (Fastify e2e)', () => {
  const catsService = { findAll: () => ['test'], create: () => {} };

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CatsModule, CoreModule],
    })
      .overrideProvider(CatsService)
      .useValue(catsService)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /cats should return all cats wrapped by TransformInterceptor', () => {
    return request(app.getHttpServer())
      .get('/cats')
      .expect(200)
      .expect({ data: catsService.findAll() });
  });
});
