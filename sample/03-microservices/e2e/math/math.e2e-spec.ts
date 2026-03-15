import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Microservices Math (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { retryAttempts: 5, retryDelay: 3000 },
    });

    await app.startAllMicroservices();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / should return the sum of [1, 2, 3, 4, 5]', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(res => {
        expect(res.text).toBe('15');
      });
  });
});
