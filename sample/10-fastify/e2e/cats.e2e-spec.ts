import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CatsModule } from '../src/cats/cats.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { CreateCatDto } from '../src/cats/dto/create-cat.dto';
import { RolesGuard } from '../src/common/guards/roles.guard';

describe('CatsController (e2e)', () => {
  let app: INestApplication;

  const mockRolesGuard = { canActivate: () => true };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CatsModule],
    })
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/cats (GET) - initial state', () => {
    return request(app.getHttpServer())
      .get('/cats')
      .expect(200)
      .expect([]);
  });

  it('/cats (POST) - create a cat', () => {
    const newCatDto: CreateCatDto = { name: 'Milo', age: 2, breed: 'Tabby' };
    const expectedCat = {
      id: 1,
      ...newCatDto,
    };

    return request(app.getHttpServer())
      .post('/cats')
      .send(newCatDto)
      .expect(201)
      .expect(expectedCat);
  });

  it('/cats (GET) - after create', () => {
    const expectedCat = {
      id: 1,
      name: 'Milo',
      age: 2,
      breed: 'Tabby',
    };

    return request(app.getHttpServer())
      .get('/cats')
      .expect(200)
      .expect([expectedCat]);
  });

  it('/cats/:id (GET) - find one', () => {
    const expectedCat = {
      id: 1,
      name: 'Milo',
      age: 2,
      breed: 'Tabby',
    };

    return request(app.getHttpServer())
      .get('/cats/1')
      .expect(200)
      .expect(expectedCat);
  });
});