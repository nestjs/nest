import { ApolloDriver } from '@nestjs/apollo';
import { INestApplication } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { join } from 'path';
import * as request from 'supertest';
import { CatsRequestScopedService } from '../src/cats/cats-request-scoped.service';
import { CatsModule } from '../src/cats/cats.module';

describe('GraphQL request scoped', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        CatsModule.enableRequestScope(),
        GraphQLModule.forRoot({
          driver: ApolloDriver,
          typePaths: [join(__dirname, '..', 'src', '**', '*.graphql')],
        }),
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    const performHttpCall = end =>
      request(app.getHttpServer())
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
        })
        .end(err => {
          if (err) return end(err);
          end();
        });

    await new Promise(resolve => performHttpCall(resolve));
    await new Promise(resolve => performHttpCall(resolve));
    await new Promise(resolve => performHttpCall(resolve));
  });

  it(`should create resolver for each incoming request`, () => {
    expect(CatsRequestScopedService.COUNTER).to.be.eql(3);
  });

  afterEach(async () => {
    await app.close();
  });
});
