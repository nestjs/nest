import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { AsyncExistingApplicationModule } from '../src/async-options-existing.module.js';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

describe('GraphQL (async existing)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await NestFactory.create(AsyncExistingApplicationModule, {
      logger: false,
    });
    await listenOnLoopback(app);
  });

  it(`should return query result`, () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        operationName: null,
        variables: {},
        query: '{\n  getCats {\n    id\n  }\n}\n',
      })
      .expect(200, {
        data: {
          getCats: [
            {
              id: 1,
            },
          ],
        },
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
