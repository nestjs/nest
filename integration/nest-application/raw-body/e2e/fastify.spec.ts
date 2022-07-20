import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { FastifyModule } from '../src/fastify.module';

describe('Raw body (Fastify Application)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [FastifyModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      {
        rawBody: true,
      },
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('application/json', () => {
    const body = '{ "amount":0.0 }';

    it('should return exact post body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': 'application/json' },
        payload: body,
      });

      expect(JSON.parse(response.body)).to.eql({
        parsed: {
          amount: 0,
        },
        raw: body,
      });
    });

    it('should fail if post body is empty', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
      });

      // Unlike Express, when you send a POST request without a body
      // with Fastify, Fastify will throw an error because it isn't valid
      // JSON. See fastify/fastify#297.
      expect(response.statusCode).to.equal(400);
    });
  });

  describe('application/x-www-form-urlencoded', () => {
    const body = 'content=this is a post\'s content by "Nest"';

    it('should return exact post body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        payload: body,
      });

      expect(JSON.parse(response.body)).to.eql({
        parsed: {
          content: 'this is a post\'s content by "Nest"',
        },
        raw: body,
      });
    });

    it('should work if post body is empty', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      });

      expect(response.statusCode).to.equal(201);
    });
  });
});
