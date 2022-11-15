import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { OptionsUrlencoded } from 'body-parser';
import { expect } from 'chai';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Body Parser (Express Application)', () => {
  const moduleFixture = Test.createTestingModule({
    imports: [AppModule],
  });
  let app: NestExpressApplication;

  afterEach(async () => {
    await app.close();
  });

  describe('application/json', () => {
    const stringLimit = '{ "msg": "Hello, World" }';
    const stringOverLimit = '{ "msg": "Hello, World!" }';

    beforeEach(async () => {
      const testFixture = await moduleFixture.compile();

      app = testFixture
        .createNestApplication<NestExpressApplication>({
          rawBody: true,
          logger: false,
        })
        .useBodyParser('json', { limit: Buffer.from(stringLimit).byteLength });

      await app.init();
    });

    it('should allow request with matching body limit', async () => {
      const response = await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/json')
        .send(stringLimit)
        .expect(201);

      expect(response.body).to.eql({
        raw: stringLimit,
      });
    });

    it('should fail if post body is larger than limit', async () => {
      await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/json')
        .send(stringOverLimit)
        .expect(413);
    });
  });

  describe('application/x-www-form-urlencoded', () => {
    const stringLimit = 'msg=Hello, World';
    const stringOverLimit = 'msg=Hello, World!';

    beforeEach(async () => {
      const testFixture = await moduleFixture.compile();

      app = testFixture
        .createNestApplication<NestExpressApplication>({
          rawBody: true,
          logger: false,
        })
        .useBodyParser<OptionsUrlencoded>('urlencoded', {
          limit: Buffer.from(stringLimit).byteLength,
          extended: true,
        });

      await app.init();
    });
    it('should allow request with matching body limit', async () => {
      const response = await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(stringLimit)
        .expect(201);

      expect(response.body).to.eql({
        raw: stringLimit,
      });
    });

    it('should fail if post body is larger than limit', async () => {
      await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(stringOverLimit)
        .expect(413);
    });
  });
});
