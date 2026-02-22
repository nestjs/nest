import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CatsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /cats', () => {
    it('should create a cat and return it', () => {
      return request(app.getHttpServer())
        .post('/cats')
        .send({ name: 'Kitty', age: 2, breed: 'Maine Coon' })
        .expect(201)
        .expect({ name: 'Kitty', age: 2, breed: 'Maine Coon' });
    });

    it('should return 400 when body is invalid', () => {
      return request(app.getHttpServer())
        .post('/cats')
        .send({ name: 123, age: 'not-a-number', breed: 'Maine Coon' })
        .expect(400);
    });
  });

  describe('GET /cats/:id', () => {
    it('should return the cat at the given index', () => {
      return request(app.getHttpServer())
        .get('/cats/0')
        .expect(200)
        .expect({ name: 'Kitty', age: 2, breed: 'Maine Coon' });
    });
  });
});
