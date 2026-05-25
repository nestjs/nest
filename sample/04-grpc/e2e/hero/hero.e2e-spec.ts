import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { grpcClientOptions } from '../../src/grpc-client.options.js';

describe('HeroController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.connectMicroservice<MicroserviceOptions>(grpcClientOptions);

    await app.startAllMicroservices();
    await app.listen(3001);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('GET /hero/:id', () => {
    it('should return a hero by id', async () => {
      const response = await request(app.getHttpServer())
        .get('/hero/1')
        .expect(200);

      expect(response.body).toMatchObject({ id: 1, name: 'John' });
    });
  });

  describe('GET /hero', () => {
    it('should return multiple heroes', async () => {
      const response = await request(app.getHttpServer())
        .get('/hero')
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'John' }),
          expect.objectContaining({ id: 2, name: 'Doe' }),
        ]),
      );
    });
  });
});
