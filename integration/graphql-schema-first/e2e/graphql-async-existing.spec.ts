import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as request from 'supertest';

import { AsyncExistingApplicationModule } from '../src/async-options-existing.module';

describe('GraphQL (async existing)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await NestFactory.create(AsyncExistingApplicationModule, {
      logger: false,
    });
    await app.init();
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
