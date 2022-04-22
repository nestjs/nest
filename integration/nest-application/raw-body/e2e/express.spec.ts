import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { ExpressModule } from '../src/express.module';

describe('Raw body (Express Application)', () => {
  let app: NestExpressApplication;
  const body = '{ "amount":0.0 }';

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ExpressModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>(
      undefined,
      { rawBody: true },
    );
  });

  it('should return exact post body', async () => {
    await app.init();
    const response = await request(app.getHttpServer())
      .post('/')
      .set('Content-Type', 'application/json')
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
