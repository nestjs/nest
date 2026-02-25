import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { RolesGuard } from '../../src/common/guards/roles.guard.js';
import { CanActivate } from '@nestjs/common';

describe('CatsController (e2e)', () => {
  let app: NestFastifyApplication;

  const mockRolesGuard: CanActivate = { canActivate: () => true };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('GET /cats', () => {
    it('should return an empty array when no cats exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/cats')
        .expect(200);

      expect(response.body).toMatchObject({ data: [] });
    });
  });

  describe('POST /cats', () => {
    it('should create a cat', async () => {
      const createCatDto = { name: 'Whiskers', age: 3, breed: 'Persian' };

      await request(app.getHttpServer())
        .post('/cats')
        .send(createCatDto)
        .expect(201);
    });

    it('should return the created cat in findAll', async () => {
      const createCatDto = { name: 'Luna', age: 2, breed: 'Siamese' };

      await request(app.getHttpServer())
        .post('/cats')
        .send(createCatDto)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/cats')
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Luna', breed: 'Siamese' }),
        ]),
      );
    });

    it('should reject invalid cat data', async () => {
      const invalidCatDto = {
        name: 'Whiskers',
        age: 'not-a-number',
        breed: 'Persian',
      };

      await request(app.getHttpServer())
        .post('/cats')
        .send(invalidCatDto)
        .expect(400);
    });
  });
});
