import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { NodeModule } from '../src/node.module.js';

describe('Raw body (Node Application)', () => {
  let app: NestNodeApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [NodeModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
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
      const response = await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/json')
        .send(body)
        .expect(201);

      expect(response.body).toEqual({
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

      expect(response.body).toEqual({
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
