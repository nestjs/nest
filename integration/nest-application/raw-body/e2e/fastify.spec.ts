import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { FastifyModule } from '../src/fastify.module';

describe('Raw body (Fastify Application)', () => {
  let app: NestFastifyApplication;
  const body = '{ "amount":0.0 }';

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [FastifyModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(null, {
      rawBody: true,
    });
  });

  it('should return exact post body', async () => {
    await app.init();
    const response = await request(app.getHttpServer())
      .post('/')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send(body)
      .expect(201);

    expect(response.body).to.eql({
      parsed: {
        amount: 0,
      },
      raw: '{ "amount":0.0 }',
    });
  });

  it('should work if post body is empty', async () => {
    await app.init();
    await request(app.getHttpServer())
      .post('/')
      .set('Content-Type', 'application/json')
      .expect(201);
  });

  afterEach(async () => {
    await app.close();
  });
});
