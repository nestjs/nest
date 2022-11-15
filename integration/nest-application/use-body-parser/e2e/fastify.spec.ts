import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { AppModule } from '../src/app.module';

describe('Body Parser (Fastify Application)', () => {
  const moduleFixture = Test.createTestingModule({
    imports: [AppModule],
  });
  let app: NestFastifyApplication;

  afterEach(async () => {
    await app.close();
  });

  describe('application/json', () => {
    const stringLimit = '{ "msg": "Hello, World" }';
    const stringOverLimit = '{ "msg": "Hello, World!" }';

    beforeEach(async () => {
      const testFixture = await moduleFixture.compile();

      app = testFixture
        .createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
          rawBody: true,
          logger: false,
        })
        .useBodyParser('application/json', {
          bodyLimit: Buffer.from(stringLimit).byteLength,
        });

      await app.init();
    });

    it('should allow request with matching body limit', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': 'application/json' },
        payload: stringLimit,
      });

      expect(JSON.parse(response.body)).to.eql({
        raw: stringLimit,
      });
    });

    it('should fail if post body is larger than limit', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': 'application/json' },
        payload: stringOverLimit,
      });

      expect(response.statusCode).to.equal(413);
    });
  });

  describe('application/x-www-form-urlencoded', () => {
    const stringLimit = 'msg=Hello, World';
    const stringOverLimit = 'msg=Hello, World!';

    beforeEach(async () => {
      const testFixture = await moduleFixture.compile();

      app = testFixture
        .createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
          rawBody: true,
          logger: false,
        })
        .useBodyParser('application/x-www-form-urlencoded', {
          bodyLimit: Buffer.from(stringLimit).byteLength,
        });

      await app.init();
    });

    it('should allow request with matching body limit', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        payload: stringLimit,
      });

      expect(JSON.parse(response.body)).to.eql({
        raw: stringLimit,
      });
    });

    it('should fail if post body is larger than limit', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        payload: stringOverLimit,
      });

      expect(response.statusCode).to.equal(413);
    });
  });
});
