import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { Cat } from '../../src/graphql.schema';
import { AppModule } from '../../src/app.module';

describe('Cats Resolver (e2e)', () => {
  let app: INestApplication;
  let cat: Cat;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should create a new cat', async () => {
    const query = `
      mutation {
        createCat(createCatInput: { name: "Cat", age: 5 }) {
          id
          name
          age
        }
      }
    `;

    return request(app.getHttpServer())
      .post('/graphql')
      .send({ query })
      .expect(200)
      .expect(response => {
        cat = response.body.data.createCat;
        expect(cat.name).toEqual('Cat');
        expect(cat.age).toEqual(5);
      });
  });

  it('should get all cats', async () => {
    const query = `
      query {
        cats {
          id
          name
          age
        }
      }
    `;

    return request(app.getHttpServer())
      .post('/graphql')
      .send({ query })
      .expect(200)
      .expect(response => {
        const cats = response.body.data.cats;
        expect(cats[0].name).toEqual('Cat');
      });
  });
});
