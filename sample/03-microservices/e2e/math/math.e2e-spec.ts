import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';

describe('MathController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { retryAttempts: 5, retryDelay: 3000 },
    });

    await app.startAllMicroservices();
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('should return 200', async () => {
      await request(app.getHttpServer()).get('/').expect(200);
    });
  });
});
