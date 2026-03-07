import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { CatsService } from '../../src/cats/cats.service';

describe('Cats (e2e)', () => {
  const catsService = { findAll: () => ['test cat'] };

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CatsService)
      .useValue(catsService)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it(`/GET cats`, () => {
    return request(app.getHttpServer())
      .get('/cats')
      .expect(200)
      .expect({ data: catsService.findAll() });
  });

  it(`/POST cats (no credentials) is forbidden`, () => {
    return request(app.getHttpServer())
      .post('/cats')
      .send({ name: 'Meow', age: 2, breed: 'Tabby' })
      .expect(403);
  });

  it(`/GET cats/:id with non-integer id returns 400`, () => {
    return request(app.getHttpServer()).get('/cats/not-a-number').expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});
