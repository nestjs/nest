import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { ExpressModule } from '../src/express.module';

describe('Raw body (Express Application)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ExpressModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({
      rawBody: true,
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('application/json', () => {
    const body = '{ "amount":0.0 }';

    it('should return exact post body', async () => {
      const response = await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/json')
        .send(body)
        .expect(201);

      expect(response.body).to.eql({
        parsed: {
          amount: 0,
        },
        raw: body,
      });
    });

    it('should work if post body is empty', async () => {
      await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/json')
        .expect(201);
    });
  });

  describe('application/x-www-form-urlencoded', () => {
    const body = 'content=this is a post\'s content by "Nest"';

    it('should return exact post body', async () => {
      const response = await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(body)
        .expect(201);

      expect(response.body).to.eql({
        parsed: {
          content: 'this is a post\'s content by "Nest"',
        },
        raw: body,
      });
    });

    it('should work if post body is empty', async () => {
      await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .expect(201);
    });
  });
});
