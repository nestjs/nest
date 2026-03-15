import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Babel Cats (e2e)', () => {
  let app;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/cats (GET) should return empty array initially', () => {
    return request(app.getHttpServer())
      .get('/cats')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toEqual([]);
      });
  });

  it('/cats (POST) should create a cat', () => {
    return request(app.getHttpServer())
      .post('/cats')
      .send({ name: 'Kitty', age: 2, breed: 'Maine Coon' })
      .expect(201);
  });

  it('/cats (GET) should return cats after creation', () => {
    return request(app.getHttpServer())
      .get('/cats')
      .expect(200)
      .expect((res) => {
        expect(res.body.length).toBe(1);
        expect(res.body[0].name).toBe('Kitty');
      });
  });
});
